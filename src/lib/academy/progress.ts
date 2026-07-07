'use server'

import { createClient } from '@/lib/supabase/server'

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface LearningOverview {
  currentPathTitle: string | null
  nextLessonId: string | null
  nextLessonTitle: string | null
  completedCount: number
  totalCount: number
  progressPercent: number
  lessons: LessonProgressItem[]
}

export interface LessonProgressItem {
  id: string
  title: string
  sort_order: number
  estimated_minutes: number
  difficulty: string
  is_completed: boolean
}

/**
 * Get full learning overview for the tester academy dashboard.
 */
export async function getAcademyLearningOverview(userId: string): Promise<DataResult<LearningOverview>> {
  const supabase = await createClient()

  // Get the first active learning path
  const { data: paths } = await supabase
    .from('learning_paths')
    .select('id, title')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)

  const currentPath = paths?.[0] ?? null

  if (!currentPath) {
    return {
      data: {
        currentPathTitle: null,
        nextLessonId: null,
        nextLessonTitle: null,
        completedCount: 0,
        totalCount: 0,
        progressPercent: 0,
        lessons: [],
      },
      error: null,
    }
  }

  // Get all published lessons in this path
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, sort_order, estimated_minutes, difficulty')
    .eq('learning_path_id', currentPath.id)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  const allLessons = lessons ?? []

  // Get user progress
  const { data: progressData } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', userId)

  const completedMap = new Map<string, boolean>()
  for (const p of progressData ?? []) {
    if (p.completed_at) {
      completedMap.set(p.lesson_id, true)
    }
  }

  const lessonItems: LessonProgressItem[] = allLessons.map((l) => ({
    id: l.id,
    title: l.title,
    sort_order: l.sort_order,
    estimated_minutes: l.estimated_minutes,
    difficulty: l.difficulty,
    is_completed: completedMap.has(l.id),
  }))

  const completedCount = lessonItems.filter((l) => l.is_completed).length
  const totalCount = lessonItems.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const nextLesson = lessonItems.find((l) => !l.is_completed) ?? null

  return {
    data: {
      currentPathTitle: currentPath.title,
      nextLessonId: nextLesson?.id ?? null,
      nextLessonTitle: nextLesson?.title ?? null,
      completedCount,
      totalCount,
      progressPercent,
      lessons: lessonItems,
    },
    error: null,
  }
}

/**
 * Mark a lesson as opened by the tester (upsert last_opened_at).
 */
export async function markLessonOpened(userId: string, lessonId: string): Promise<DataResult<{ success: boolean }>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    )

  if (error) {
    return { data: null, error: 'Failed to track lesson progress.' }
  }

  return { data: { success: true }, error: null }
}

/**
 * Mark a lesson as completed by the tester.
 */
export async function markLessonCompleted(userId: string, lessonId: string): Promise<DataResult<{ success: boolean }>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    )

  if (error) {
    return { data: null, error: 'Failed to mark lesson as completed.' }
  }

  return { data: { success: true }, error: null }
}
