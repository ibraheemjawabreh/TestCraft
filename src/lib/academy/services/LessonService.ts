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

interface LessonNavigation {
  previous: { id: string; title_en: string; title_ar: string; module_id: string } | null
  next: { id: string; title_en: string; title_ar: string; module_id: string; available: boolean } | null
  completed: number
  total: number
  position: number | null
}

interface LessonPageData {
  lesson: TesterLessonFull
  navigation: Result<LessonNavigation>
  progress: { last_opened_at: string; completed_at: string | null } | null
}

const lessonColumns = 'id,module_id,learning_path_id,title,title_en,title_ar,slug,summary,summary_en,summary_ar,objectives_en,objectives_ar,estimated_minutes,difficulty,sort_order,learning_modules(title_en,title_ar)'

export async function getLessonWithModuleGate(
  userId: string,
  lessonId: string,
  locale: Locale,
): Promise<Result<LessonPageData>> {
  try {
    const db = await createClient()
    const contentField = locale === 'ar' ? 'content_ar' : 'content_en'
    const [lessonResult, progressResult, navigationResult] = await Promise.all([
      db.from('lessons').select(`${lessonColumns},${contentField}` as const)
        .eq('id', lessonId).eq('is_published', true).single(),
      db.from('lesson_progress').select('completed_at,last_opened_at')
        .eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle(),
      db.rpc('curriculum_lesson_navigation', { p_lesson: lessonId }),
    ])
    if (lessonResult.error || !lessonResult.data) return { data: null, error: 'Lesson not found or not published.' }
    const lesson = lessonResult.data

    // This RPC already calls curriculum_can_read_lesson(). On failure, use
    // the gate to distinguish a locked lesson from a navigation outage.
    const navigation: Result<LessonNavigation> = {
      data: navigationResult.error ? null : navigationResult.data,
      error: navigationResult.error?.message ?? null,
    }
    if (lesson.module_id && !navigation.data) {
      const { data: allowed, error: gateError } = await db.rpc('curriculum_can_read_lesson', { p_lesson: lessonId })
      if (gateError || !allowed) return { data: null, error: 'module_locked' }
    }

    async function findChallenge() {
      let isLastInModule = !lesson.module_id ||
        (navigation.data?.position != null && navigation.data.next?.module_id !== lesson.module_id)
      if (lesson.module_id && navigation.data?.position == null) {
        const { data: lastLesson } = await db.from('lessons').select('id')
          .eq('module_id', lesson.module_id).eq('is_published', true)
          .order('sort_order', { ascending: false }).order('slug', { ascending: false }).limit(1).maybeSingle()
        isLastInModule = lastLesson?.id === lesson.id
      }
      if (!isLastInModule) return null
      const query = db.from('challenges').select('id').eq('is_active', true)
      const { data } = await (lesson.module_id ? query.eq('module_id', lesson.module_id) : query.eq('lesson_id', lesson.id)).maybeSingle()
      return data?.id ?? null
    }

    async function readContent() {
      const localized = (lesson as Record<string, unknown>)[contentField]
      if (typeof localized === 'string' && localized.trim()) return localized
      // Legacy lessons may need the other language or the old content column.
      const { data } = await db.from('lessons').select('content,content_en,content_ar').eq('id', lessonId).single()
      return data ? getLocalizedContent(data, 'content', locale) : ''
    }

    const [challengeId, content] = await Promise.all([findChallenge(), readContent()])
    const moduleData = Array.isArray(lesson.learning_modules) ? lesson.learning_modules[0] : lesson.learning_modules
    const progress = progressResult.data
    return {
      data: {
        navigation,
        progress,
        lesson: {
          id: lesson.id,
          module_id: lesson.module_id ?? null,
          module_title: moduleData ? getLocalizedContent(moduleData, 'title', locale) : null,
          learning_path_id: lesson.learning_path_id,
          title: getLocalizedContent(lesson, 'title', locale),
          slug: lesson.slug,
          summary: getLocalizedContent(lesson, 'summary', locale),
          content,
          objectives: getLocalizedArray(lesson, 'objectives', locale),
          estimated_minutes: lesson.estimated_minutes,
          difficulty: lesson.difficulty,
          sort_order: lesson.sort_order,
          is_completed: !!progress?.completed_at,
          is_locked: false,
          lock_reason: 'unlocked',
          related_challenge_id: challengeId,
        },
      },
      error: null,
    }
  } catch (err) {
    console.error('getLessonWithModuleGate error:', err)
    return { data: null, error: 'Failed to load lesson.' }
  }
}
