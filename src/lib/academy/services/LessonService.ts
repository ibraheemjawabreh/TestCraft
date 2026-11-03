import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getLocalizedContent, getLocalizedArray } from '@/lib/i18n/content'
import type { Locale } from '@/i18n/config'
import { getModuleAccessStatus } from './ProgressService'

interface Result<T> { data: T | null; error: string | null }

export interface TesterLessonFull {
  id: string
  module_id: string | null
  module_title: string | null
  learning_path_id: string
  title: string
  slug: string
  summary: string
  content: string
  objectives: string[]
  estimated_minutes: number
  difficulty: string
  sort_order: number
  is_completed: boolean
  is_locked: boolean
  lock_reason: string
  related_challenge_id: string | null
}

/**
 * Fetch a lesson with full module-aware access gate.
 * Replaces the old getTesterLesson from lib/academy/lessons.ts
 */
export async function getLessonWithModuleGate(
  userId: string,
  lessonId: string,
  locale: Locale
): Promise<Result<TesterLessonFull>> {
  try {
    const supabase = await createClient()

    const { data: lesson, error } = await supabase
      .from('lessons')
      .select(`
        *,
        learning_modules ( title_en, title_ar )
      `)
      .eq('id', lessonId)
      .eq('is_published', true)
      .single()

    if (error || !lesson) {
      return { data: null, error: 'Lesson not found or not published.' }
    }

    // Check module access
    if (lesson.module_id) {
      const { data: allowed, error: gateError } = await supabase.rpc('curriculum_can_read_module', { p_module: lesson.module_id })
      if (gateError || !allowed) {
        return { data: null, error: 'module_locked' }
      }
    }

    // Get completion status
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('completed_at, status')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    const is_completed = !!progress?.completed_at

    let isLastInModule = true
    if (lesson.module_id) {
      const { count } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', lesson.module_id)
        .gt('sort_order', lesson.sort_order)

      if (count && count > 0) {
        isLastInModule = false
      }
    }

    let challengeId = null
    if (isLastInModule) {
      let query = supabase.from('challenges').select('id').eq('is_active', true)
      
      if (lesson.module_id) {
        query = query.eq('module_id', lesson.module_id)
      } else {
        query = query.eq('lesson_id', lesson.id)
      }

      const { data: challenge } = await query.maybeSingle()
      challengeId = challenge?.id ?? null
    }

    const moduleData = lesson.learning_modules as any

    return {
      data: {
        id: lesson.id,
        module_id: lesson.module_id ?? null,
        module_title: moduleData ? getLocalizedContent(moduleData, 'title', locale) : null,
        learning_path_id: lesson.learning_path_id,
        title: getLocalizedContent(lesson, 'title', locale),
        slug: lesson.slug,
        summary: getLocalizedContent(lesson, 'summary', locale),
        content: getLocalizedContent(lesson, 'content', locale),
        objectives: getLocalizedArray(lesson, 'objectives', locale),
        estimated_minutes: lesson.estimated_minutes,
        difficulty: lesson.difficulty,
        sort_order: lesson.sort_order,
        is_completed,
        is_locked: false,
        lock_reason: 'unlocked',
        related_challenge_id: challengeId,
      },
      error: null,
    }
  } catch (err) {
    console.error('getLessonWithModuleGate error:', err)
    return { data: null, error: 'Failed to load lesson.' }
  }
}

/**
 * Get the next lesson after the given lesson, ordered by sort_order.
 * Stays within the same module first, then moves to the next module.
 */
export async function getNextLessonForUser(
  userId: string,
  locale: Locale,
  currentLessonId?: string,
): Promise<Result<{ id: string; title: string; moduleTitle: string | null } | null>> {
  try {
    const supabase = await createClient()

    if (currentLessonId) {
      // Get current lesson details
      const { data: current } = await supabase
        .from('lessons')
        .select('module_id, sort_order, learning_path_id')
        .eq('id', currentLessonId)
        .single()

      if (current?.module_id) {
        // Look for the next lesson in the same module by sort_order
        const { data: nextInModule } = await supabase
          .from('lessons')
          .select('id, title_en, title_ar, learning_modules(title_en, title_ar)')
          .eq('module_id', current.module_id)
          .eq('is_published', true)
          .gt('sort_order', current.sort_order)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (nextInModule) {
          const mod = nextInModule.learning_modules as any
          return {
            data: {
              id: nextInModule.id,
              title: getLocalizedContent(nextInModule, 'title', locale),
              moduleTitle: mod ? getLocalizedContent(mod, 'title', locale) : null,
            },
            error: null,
          }
        }

        // No more lessons in this module — no "next lesson" button
        // (user should go to challenge or next module via academy page)
        return { data: null, error: null }
      }
    }

    // Fallback (no currentLessonId): find first uncompleted lesson in current module
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const completedIds = new Set((completedLessons ?? []).map(l => l.lesson_id))

    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, title_en, title_ar, module_id, sort_order, learning_modules(title_en, title_ar)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    const next = (allLessons ?? []).find(l => !completedIds.has(l.id))
    if (next) {
      const mod = next.learning_modules as any
      return {
        data: {
          id: next.id,
          title: getLocalizedContent(next, 'title', locale),
          moduleTitle: mod ? getLocalizedContent(mod, 'title', locale) : null,
        },
        error: null,
      }
    }

    return { data: null, error: null }
  } catch (err) {
    console.error('getNextLessonForUser error:', err)
    return { data: null, error: 'Failed to get next lesson.' }
  }
}

