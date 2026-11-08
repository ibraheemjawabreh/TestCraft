import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getLocalizedContent, getLocalizedArray } from '@/lib/i18n/content'
import type { Locale } from '@/i18n/config'

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
      const { data: allowed, error: gateError } = await supabase.rpc('curriculum_can_read_lesson', { p_lesson: lesson.id })
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
      const { data: lastLesson } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', lesson.module_id)
        .eq('is_published', true)
        .order('sort_order', { ascending: false })
        .order('slug', { ascending: false })
        .limit(1)
        .maybeSingle()
      isLastInModule = lastLesson?.id === lesson.id
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


export interface LessonNavigation {
  previous: { id: string; title_en: string; title_ar: string; module_id: string } | null
  next: { id: string; title_en: string; title_ar: string; module_id: string; available: boolean } | null
  completed: number
  total: number
  position: number
}
export async function getLessonNavigation(lessonId: string): Promise<Result<LessonNavigation>> {
  const db = await createClient()
  const { data, error } = await db.rpc('curriculum_lesson_navigation', { p_lesson: lessonId })
  return { data: error ? null : data, error: error?.message ?? null }
}
