import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { getLocalizedContent } from '@/lib/i18n/content'
import type { Locale } from '@/i18n/config'

type LearningModule = Database['public']['Tables']['learning_modules']['Row']

export type ModuleStatus = 'locked' | 'available' | 'in_progress' | 'completed'
export type LessonStatus = 'not_started' | 'in_progress' | 'completed'

export interface LessonWithProgress {
  id: string
  title: string
  slug: string
  sort_order: number
  estimated_minutes: number
  difficulty: string
  status: LessonStatus
  is_completed: boolean
}

export interface ModuleChallengeStatus {
  id: string
  title: string
  status: 'locked' | 'available' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'completed'
  attemptId: string | null
}

export interface ModuleWithProgress {
  id: string
  learning_path_id: string
  title: string
  description: string | null
  slug: string
  sort_order: number
  is_published: boolean
  status: ModuleStatus
  completion_percentage: number
  completed_lessons: number
  total_lessons: number
  lessons: LessonWithProgress[]
  challenge: ModuleChallengeStatus | null
}

export interface LearningPathWithModules {
  id: string
  title: string
  description: string
  slug: string
  completion_percentage: number
  completed_modules: number
  total_modules: number
  modules: ModuleWithProgress[]
}

interface PathSummary { id: string; title: string; slug: string; description: string }
const pathFields = 'id,title,title_en,title_ar,slug,description,description_en,description_ar'
function localizePath(row: Record<string, unknown> & { id: string; slug: string }, locale: Locale): PathSummary {
  return { id: row.id, slug: row.slug, title: getLocalizedContent(row, 'title', locale), description: getLocalizedContent(row, 'description', locale) }
}

interface Result<T> {
  data: T | null
  error: string | null
}

/**
 * Fetches the complete learning path with all modules, lessons, and progress
 * for a specific user. This is the primary data source for the Academy page.
 */
export async function getLearningPathWithProgress(
  pathId: string,
  userId: string,
  locale: Locale,
  summary?: PathSummary | Promise<PathSummary | null>
): Promise<Result<LearningPathWithModules>> {
  try {
    const supabase = await createClient()
    const pathPromise = summary
      ? Promise.resolve(summary).then(path => path?.id === pathId ? path : null)
      : Promise.resolve(supabase.from('learning_paths').select(pathFields).eq('id', pathId).single())
        .then(({ data, error }) => data && !error ? localizePath(data, locale) : null)

    // Batch fetch all required data in parallel
    const [path, modulesResult, lessonsResult, challengesResult,
           modProgressResult, lessonProgressResult, accessResult] = await Promise.all([
      pathPromise,
      supabase.from('learning_modules')
        .select('id,learning_path_id,slug,title_en,title_ar,description_en,description_ar,sort_order,is_published')
        .eq('learning_path_id', pathId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true }).order('slug'),
      supabase.from('lessons')
        .select('id, title_en, title_ar, slug, sort_order, estimated_minutes, difficulty, module_id')
        .eq('learning_path_id', pathId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true }).order('slug'),
      supabase.from('challenges')
        .select('id,title_en,title_ar,module_id,learning_modules!inner(),latest:challenge_attempts(id,status,is_passed),passed:challenge_attempts(id,status,is_passed)')
        .eq('is_active', true)
        .eq('learning_modules.learning_path_id', pathId)
        .eq('learning_modules.is_published', true)
        .eq('latest.user_id', userId)
        .order('created_at', { referencedTable: 'latest', ascending: false })
        .limit(1, { referencedTable: 'latest' })
        .eq('passed.user_id', userId)
        .eq('passed.is_passed', true)
        // Preserve the prior selection of the oldest successful attempt.
        .order('created_at', { referencedTable: 'passed', ascending: true })
        .limit(1, { referencedTable: 'passed' }),
      supabase.from('module_progress')
        .select('module_id,status,learning_modules!inner()')
        .eq('user_id', userId)
        .eq('learning_modules.learning_path_id', pathId)
        .eq('learning_modules.is_published', true),
      supabase.from('lesson_progress')
        .select('lesson_id,completed_at,lessons!inner()')
        .eq('user_id', userId)
        .eq('lessons.learning_path_id', pathId)
        .eq('lessons.is_published', true),
      supabase.rpc('curriculum_path_status', { p_path: pathId }),
    ])

    if (!path) {
      return { data: null, error: 'Learning path not found.' }
    }

    if ([modulesResult, lessonsResult, challengesResult, modProgressResult, lessonProgressResult].some(result => result.error)) {
      return { data: null, error: 'Failed to load learning path.' }
    }
    const modules = modulesResult.data ?? []
    const lessons = lessonsResult.data ?? []
    const challenges = challengesResult.data ?? []
    const modProgress = modProgressResult.data ?? []
    const lessonProgress = lessonProgressResult.data ?? []
    // Build lookup maps for O(1) access
    const modProgressMap = new Map(modProgress.map(mp => [mp.module_id, mp]))
    const lessonProgressMap = new Map(lessonProgress.map(lp => [lp.lesson_id, lp]))
    const challengesByModule = new Map<string, typeof challenges[0]>()
    for (const ch of challenges) {
      if (ch.module_id) challengesByModule.set(ch.module_id, ch)
    }
    const lessonsByModule = new Map<string, typeof lessons>()
    for (const lesson of lessons) {
      if (!lesson.module_id) continue
      const list = lessonsByModule.get(lesson.module_id) ?? []
      list.push(lesson)
      lessonsByModule.set(lesson.module_id, list)
    }

    // If the RPC doesn't exist yet (migration 034 not applied), fall back to open access
    // so the page renders instead of showing a generic error. Apply the educational engine
    // migrations (supabase/apply_educational_engine_migrations.sql) to enable proper gates.
    let access: Map<string, { allowed: boolean; ready: boolean }>
    if (accessResult.error) {
      const isSchemaError = /function.*curriculum_path_status.*does not exist|could not find.*schema cache|PGRST/i.test(
        accessResult.error.message ?? ''
      )
      if (!isSchemaError) {
        // Real unexpected error – surface it
        return { data: null, error: 'Failed to verify module access.' }
      }
      // Migration not applied yet: unlock all published modules so the page loads
      console.warn(
        '[TestCraft] curriculum_path_status RPC missing – apply supabase/apply_educational_engine_migrations.sql to enable module gates.'
      )
      access = new Map(
        modules.map((m) => [m.id, { allowed: true, ready: false }])
      )
    } else {
      access = new Map<string, { allowed: boolean; ready: boolean }>(
        (accessResult.data ?? []).map((m: { id: string; allowed: boolean; ready: boolean }) => [m.id, m])
      )
    }
    // Use authoritative gates; student RLS intentionally hides draft lesson rows.
    const enrichedModules: ModuleWithProgress[] = modules.map((mod) => {
      const mp = modProgressMap.get(mod.id)
      const moduleLessons = lessonsByModule.get(mod.id) ?? []
      const moduleChallenge = challengesByModule.get(mod.id) ?? null

      // Determine lesson statuses
      const enrichedLessons: LessonWithProgress[] = moduleLessons.map(lesson => {
        const lp = lessonProgressMap.get(lesson.id)
        const lessonStatus: LessonStatus = lp
          ? (lp.completed_at ? 'completed' : 'in_progress')
          : 'not_started'
        return {
          id: lesson.id,
          title: getLocalizedContent(lesson, 'title', locale),
          slug: lesson.slug,
          sort_order: lesson.sort_order,
          estimated_minutes: lesson.estimated_minutes,
          difficulty: lesson.difficulty,
          status: lessonStatus,
          is_completed: lessonStatus === 'completed',
        }
      })

      const totalLessons = enrichedLessons.length
      const completedLessons = enrichedLessons.filter(l => l.is_completed).length
      const allLessonsCompleted = access.get(mod.id)?.ready === true

      // Is this module accessible at all?
      const isModuleUnlocked = access.get(mod.id)?.allowed === true

      // Determine challenge status for this module
      let challengeStatus: ModuleChallengeStatus | null = null
      if (moduleChallenge) {
        const attempt = moduleChallenge.passed?.[0] ?? moduleChallenge.latest?.[0]
        let cStatus: ModuleChallengeStatus['status']

        if (!isModuleUnlocked) {
          // Module is locked → challenge is also locked
          cStatus = 'locked'
        } else if (attempt?.is_passed) {
          cStatus = 'completed'
        } else if (attempt?.status === 'approved') {
          // approved but not yet flagged is_passed — treat as completed
          cStatus = 'completed'
        } else if (attempt?.status === 'reviewing') {
          cStatus = 'submitted'
        } else if (attempt?.status === 'submitted') {
          cStatus = 'submitted'
        } else if (attempt?.status === 'rejected') {
          cStatus = 'rejected'
        } else if (attempt?.status === 'started') {
          cStatus = 'in_progress'
        } else if (allLessonsCompleted) {
          // All lessons done → challenge is now available to attempt
          cStatus = 'available'
        } else {
          // Lessons not yet done → challenge is locked
          cStatus = 'locked'
        }

        challengeStatus = {
          id: moduleChallenge.id,
          title: getLocalizedContent(moduleChallenge, 'title', locale),
          status: cStatus,
          attemptId: attempt?.id ?? null,
        }
      }

      // A module is "fully completed" when:
      //   - all lessons are done AND challenge passed/completed (or no challenge)
      //   - OR the module_progress in DB already says 'completed' (self-healing for old data)
      const challengePassed =
        !moduleChallenge ||
        challengeStatus?.status === 'completed'

      const isModuleFullyCompleted = allLessonsCompleted && challengePassed

      // Determine module display status
      let moduleStatus: ModuleStatus = 'locked'
      if (isModuleUnlocked) {
        if (isModuleFullyCompleted) {
          moduleStatus = 'completed'
        } else if (completedLessons > 0 || (mp && mp.status !== 'locked')) {
          moduleStatus = 'in_progress'
        } else {
          moduleStatus = 'available'
        }
      }

      const completionPct = totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : (isModuleFullyCompleted ? 100 : 0)

      return {
        id: mod.id,
        learning_path_id: mod.learning_path_id,
        title: getLocalizedContent(mod, 'title', locale),
        description: mod.description_en ? getLocalizedContent(mod, 'description', locale) : null,
        slug: mod.slug,
        sort_order: mod.sort_order,
        is_published: mod.is_published,
        status: moduleStatus,
        completion_percentage: completionPct,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        lessons: enrichedLessons,
        challenge: challengeStatus,
      }
    })

    const totalModules = enrichedModules.length
    const completedModulesCount = enrichedModules.filter(m => m.status === 'completed').length
    const pathCompletionPct = totalModules > 0
      ? Math.round((completedModulesCount / totalModules) * 100)
      : 0

    return {
      data: {
        ...path,
        completion_percentage: pathCompletionPct,
        completed_modules: completedModulesCount,
        total_modules: totalModules,
        modules: enrichedModules,
      },
      error: null,
    }
  } catch (err) {
    console.error('getLearningPathWithProgress error:', err)
    return { data: null, error: 'Failed to load learning path.' }
  }
}

/**
 * Fetch all active learning paths with basic info for dashboard.
 */
export async function getAllLearningPaths(locale: Locale): Promise<Result<PathSummary[]>> {
  try {
    const supabase = await createClient()
    // is_active is added by migration 034. Fall back to is_published for older schemas.
    let { data, error } = await supabase
      .from('learning_paths')
      .select(pathFields)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error && /column.*is_active.*does not exist|PGRST/i.test(error.message ?? '')) {
      // Migration 034 not applied yet – fall back to is_published
      ;({ data, error } = await supabase
        .from('learning_paths')
        .select(pathFields)
        .eq('is_published', true)
        .order('sort_order', { ascending: true }))
    }

    if (error) return { data: null, error: 'Failed to fetch learning paths.' }

    return {
      data: (data ?? []).map(p => localizePath(p, locale)),
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to fetch learning paths.' }
  }
}

/**
 * Get just the modules for a given learning path (admin use: no progress).
 */
export async function getModulesForPath(pathId: string, locale: Locale): Promise<Result<(LearningModule & { title: string })[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('learning_modules')
      .select('*')
      .eq('learning_path_id', pathId)
      .order('sort_order', { ascending: true })

    if (error) return { data: null, error: 'Failed to fetch modules.' }

    return {
      data: (data ?? []).map(m => ({ ...m, title: getLocalizedContent(m, 'title', locale) })),
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to fetch modules.' }
  }
}
