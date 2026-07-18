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
      const moduleStatus = await getModuleAccessStatus(userId, lesson.module_id)
      if (moduleStatus === 'locked') {
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
        .eq('is_published', true)
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
        summary: lesson.summary ? getLocalizedContent(lesson, 'summary', locale) : '',
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
 * Get the next uncompleted lesson for a user across all paths.
 */
export async function getNextLessonForUser(
  userId: string,
  locale: Locale
): Promise<Result<{ id: string; title: string; moduleTitle: string | null } | null>> {
  try {
    const supabase = await createClient()

    // Get in-progress lesson_progress entries
    const { data: inProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle()

    if (inProgress) {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('id, title_en, title_ar, learning_modules(title_en, title_ar)')
        .eq('id', inProgress.lesson_id)
        .single()

      if (lesson) {
        const mod = lesson.learning_modules as any
        return {
          data: {
            id: lesson.id,
            title: getLocalizedContent(lesson, 'title', locale),
            moduleTitle: mod ? getLocalizedContent(mod, 'title', locale) : null,
          },
          error: null,
        }
      }
    }

    // Fall back: find first not-started lesson in an available module
    const { data: availableModProgress } = await supabase
      .from('module_progress')
      .select('module_id')
      .eq('user_id', userId)
      .in('status', ['available', 'in_progress'])
      .limit(5)

    if (availableModProgress && availableModProgress.length > 0) {
      const modIds = availableModProgress.map(m => m.module_id)
      const { data: completedLessons } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('status', 'completed')

      const completedIds = new Set((completedLessons ?? []).map(l => l.lesson_id))

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title_en, title_ar, module_id, sort_order, learning_modules(title_en, title_ar)')
        .in('module_id', modIds)
        .eq('is_published', true)
        .order('sort_order', { ascending: true })

      const nextLesson = (lessons ?? []).find(l => !completedIds.has(l.id))
      if (nextLesson) {
        const mod = nextLesson.learning_modules as any
        return {
          data: {
            id: nextLesson.id,
            title: getLocalizedContent(nextLesson, 'title', locale),
            moduleTitle: mod ? getLocalizedContent(mod, 'title', locale) : null,
          },
          error: null,
        }
      }
    }

    // Last resort: very first lesson of very first module
    const { data: firstLesson } = await supabase
      .from('lessons')
      .select('id, title_en, title_ar, learning_modules(title_en, title_ar)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstLesson) {
      const mod = firstLesson.learning_modules as any
      return {
        data: {
          id: firstLesson.id,
          title: getLocalizedContent(firstLesson, 'title', locale),
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
