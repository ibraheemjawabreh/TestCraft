import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { getLocalizedContent } from '@/lib/i18n/content'
import type { Locale } from '@/i18n/config'

type LearningModule = Database['public']['Tables']['learning_modules']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']
type ModuleProgress = Database['public']['Tables']['module_progress']['Row']
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row']

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
  current_module_id: string | null
  current_lesson_id: string | null
  modules: ModuleWithProgress[]
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
  locale: Locale
): Promise<Result<LearningPathWithModules>> {
  try {
    const supabase = await createClient()

    // Batch fetch all required data in parallel
    const [pathResult, modulesResult, lessonsResult, challengesResult,
           modProgressResult, lessonProgressResult, attemptResult, lppResult] = await Promise.all([
      supabase.from('learning_paths').select('*').eq('id', pathId).single(),
      supabase.from('learning_modules')
        .select('*')
        .eq('learning_path_id', pathId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true }),
      supabase.from('lessons')
        .select('id, title_en, title_ar, slug, sort_order, estimated_minutes, difficulty, module_id')
        .eq('learning_path_id', pathId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true }),
      supabase.from('challenges')
        .select('id, title_en, title_ar, module_id, is_active')
        .eq('is_active', true)
        .not('module_id', 'is', null),
      supabase.from('module_progress')
        .select('*')
        .eq('user_id', userId),
      supabase.from('lesson_progress')
        .select('lesson_id, status, completed_at')
        .eq('user_id', userId),
      supabase.from('challenge_attempts')
        .select('id, challenge_id, status, is_passed')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('learning_path_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('learning_path_id', pathId)
        .maybeSingle(),
    ])

    if (pathResult.error || !pathResult.data) {
      return { data: null, error: 'Learning path not found.' }
    }

    const path = pathResult.data
    const modules = modulesResult.data ?? []
    const lessons = lessonsResult.data ?? []
    const challenges = challengesResult.data ?? []
    const modProgress = modProgressResult.data ?? []
    const lessonProgress = lessonProgressResult.data ?? []
    const attempts = attemptResult.data ?? []
    const lpp = lppResult.data

    // Build lookup maps for O(1) access
    const modProgressMap = new Map(modProgress.map(mp => [mp.module_id, mp]))
    const lessonProgressMap = new Map(lessonProgress.map(lp => [lp.lesson_id, lp]))
    const challengeAttemptMap = new Map<string, typeof attempts[0]>()
    // For each challenge, get the most relevant attempt (approved > submitted > latest)
    for (const attempt of attempts) {
      const existing = challengeAttemptMap.get(attempt.challenge_id)
      if (!existing || attempt.is_passed) {
        challengeAttemptMap.set(attempt.challenge_id, attempt)
      }
    }
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

    // Determine module unlock status sequentially
    // Rule: Module N is unlocked when Module (N-1) is FULLY completed:
    //       all lessons done + challenge passed (or no challenge in that module)
    let previousModuleFullyCompleted = true // Module 1 is always available

    const enrichedModules: ModuleWithProgress[] = modules.map((mod, idx) => {
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
      const allLessonsCompleted = totalLessons > 0 && completedLessons === totalLessons

      // Is this module accessible at all?
      const isModuleUnlocked = idx === 0 || previousModuleFullyCompleted

      // Determine challenge status for this module
      let challengeStatus: ModuleChallengeStatus | null = null
      if (moduleChallenge) {
        const attempt = challengeAttemptMap.get(moduleChallenge.id)
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

      const isModuleFullyCompleted =
        (allLessonsCompleted && challengePassed) ||
        mp?.status === 'completed'

      // Determine module display status
      let moduleStatus: ModuleStatus = 'locked'
      if (isModuleUnlocked) {
        if (isModuleFullyCompleted || mp?.status === 'completed') {
          moduleStatus = 'completed'
        } else if (completedLessons > 0 || (mp && mp.status !== 'locked')) {
          moduleStatus = 'in_progress'
        } else {
          moduleStatus = 'available'
        }
      }

      // Pass to the next iteration: this module is fully completed?
      previousModuleFullyCompleted = isModuleFullyCompleted || mp?.status === 'completed'

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
        id: path.id,
        title: getLocalizedContent(path, 'title', locale),
        description: getLocalizedContent(path, 'description', locale),
        slug: path.slug,
        completion_percentage: pathCompletionPct,
        completed_modules: completedModulesCount,
        total_modules: totalModules,
        current_module_id: lpp?.current_module_id ?? null,
        current_lesson_id: lpp?.current_lesson_id ?? null,
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
export async function getAllLearningPaths(locale: Locale): Promise<Result<{ id: string; title: string; slug: string }[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('learning_paths')
      .select('id, title_en, title_ar, slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { data: null, error: 'Failed to fetch learning paths.' }

    return {
      data: (data ?? []).map(p => ({
        id: p.id,
        title: getLocalizedContent(p, 'title', locale),
        slug: p.slug,
      })),
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
