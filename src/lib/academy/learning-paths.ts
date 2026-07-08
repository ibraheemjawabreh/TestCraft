'use server'

import { createClient } from '@/lib/supabase/server'
import { getLocalizedContent } from '@/lib/i18n/content'
import { Locale } from '@/i18n/config'

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface TesterLearningPath {
  id: string
  title: string
  description: string
  slug: string
  total_lessons: number
  completed_lessons: number
  progress_percentage: number
}

/**
 * Fetch all active learning paths for a tester, including their localized content and progress.
 */
export async function getTesterLearningPaths(userId: string, locale: Locale): Promise<DataResult<TesterLearningPath[]>> {
  const supabase = await createClient()

  // 1. Get active paths
  const { data: paths, error: pathsError } = await supabase
    .from('learning_paths')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (pathsError) {
    return { data: null, error: 'Failed to load learning paths.' }
  }

  // 2. Get published lessons for these paths
  const pathIds = paths.map((p) => p.id)
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, learning_path_id')
    .in('learning_path_id', pathIds)
    .eq('is_published', true)

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  // 3. Get user progress
  const { data: progress, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)

  if (progressError) {
    return { data: null, error: 'Failed to load progress.' }
  }

  const completedLessonIds = new Set(progress.map((p) => p.lesson_id))

  // 4. Calculate metrics and apply i18n
  const results = paths.map((path) => {
    const pathLessons = lessons.filter((l) => l.learning_path_id === path.id)
    const total_lessons = pathLessons.length
    const completed_lessons = pathLessons.filter((l) => completedLessonIds.has(l.id)).length
    const progress_percentage = total_lessons > 0 ? Math.round((completed_lessons / total_lessons) * 100) : 0

    return {
      id: path.id,
      title: getLocalizedContent(path, 'title', locale),
      description: getLocalizedContent(path, 'description', locale),
      slug: path.slug,
      total_lessons,
      completed_lessons,
      progress_percentage,
    }
  })

  return { data: results, error: null }
}
