'use server'

import { createClient } from '@/lib/supabase/server'

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface TesterLesson {
  id: string
  learning_path_id: string
  title: string
  slug: string
  summary: string | null
  content: string
  objectives: string[]
  estimated_minutes: number
  difficulty: string
  sort_order: number
  is_published: boolean
  learning_path_title: string | null
  is_completed: boolean
  related_challenge_id: string | null
}

/**
 * Fetch a single published lesson for tester view, including progress and related challenge.
 */
export async function getLessonForTester(lessonId: string, userId: string): Promise<DataResult<TesterLesson>> {
  const supabase = await createClient()

  // Fetch lesson with learning path title
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title )
    `)
    .eq('id', lessonId)
    .eq('is_published', true)
    .single()

  if (lessonError || !lesson) {
    return { data: null, error: 'Lesson not found.' }
  }

  // Check progress
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  // Find related active challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const pathData = lesson.learning_paths as { title: string } | null

  return {
    data: {
      id: lesson.id,
      learning_path_id: lesson.learning_path_id,
      title: lesson.title,
      slug: lesson.slug,
      summary: lesson.summary,
      content: lesson.content,
      objectives: lesson.objectives,
      estimated_minutes: lesson.estimated_minutes,
      difficulty: lesson.difficulty,
      sort_order: lesson.sort_order,
      is_published: lesson.is_published,
      learning_path_title: pathData?.title ?? null,
      is_completed: !!progress?.completed_at,
      related_challenge_id: challenge?.id ?? null,
    },
    error: null,
  }
}

/**
 * Get the next uncompleted lesson for a tester within their first active path.
 */
export async function getNextLessonForTester(userId: string): Promise<DataResult<{ id: string; title: string } | null>> {
  const supabase = await createClient()

  // Get published lessons in order
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, sort_order, learning_path_id')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  if (!lessons || lessons.length === 0) {
    return { data: null, error: null }
  }

  // Get completed lessons
  const { data: completedProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)

  const completedIds = new Set((completedProgress ?? []).map((p) => p.lesson_id))

  const nextLesson = lessons.find((l) => !completedIds.has(l.id))

  if (!nextLesson) {
    return { data: null, error: null }
  }

  return { data: { id: nextLesson.id, title: nextLesson.title }, error: null }
}
