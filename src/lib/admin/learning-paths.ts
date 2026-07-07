'use server'

import { createClient } from '@/lib/supabase/server'
import type { LearningPathFormValues } from '@/lib/validations/learning-path'

interface DataResult<T> {
  data: T | null
  error: string | null
}

interface LearningPath {
  id: string
  title: string
  description: string
  slug: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface LearningPathWithLessonCount extends LearningPath {
  lessons_count: number
}

/**
 * Fetch all learning paths with lesson counts for admin.
 */
export async function getAdminLearningPaths(): Promise<DataResult<LearningPathWithLessonCount[]>> {
  const supabase = await createClient()

  const { data: paths, error: pathsError } = await supabase
    .from('learning_paths')
    .select('*')
    .order('sort_order', { ascending: true })

  if (pathsError) {
    return { data: null, error: 'Failed to load learning paths.' }
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('learning_path_id')

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons count.' }
  }

  const countMap = new Map<string, number>()
  for (const lesson of lessons) {
    if (lesson.learning_path_id) {
      countMap.set(lesson.learning_path_id, (countMap.get(lesson.learning_path_id) ?? 0) + 1)
    }
  }

  const pathsWithCounts: LearningPathWithLessonCount[] = (paths as LearningPath[]).map((p) => ({
    ...p,
    lessons_count: countMap.get(p.id) ?? 0,
  }))

  return { data: pathsWithCounts, error: null }
}

/**
 * Fetch a single learning path by ID for admin.
 */
export async function getAdminLearningPathById(id: string): Promise<DataResult<LearningPath>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Learning path not found.' }
  }

  return { data: data as LearningPath, error: null }
}

/**
 * Create a new learning path.
 */
export async function createLearningPath(input: LearningPathFormValues): Promise<DataResult<LearningPath>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .insert({
      title: input.title,
      description: input.description,
      slug: input.slug,
      is_active: input.is_active,
      sort_order: input.sort_order,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'slug_taken' }
    }
    return { data: null, error: 'Failed to create learning path.' }
  }

  return { data: data as LearningPath, error: null }
}

/**
 * Update an existing learning path.
 */
export async function updateLearningPath(id: string, input: LearningPathFormValues): Promise<DataResult<LearningPath>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .update({
      title: input.title,
      description: input.description,
      slug: input.slug,
      is_active: input.is_active,
      sort_order: input.sort_order,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'slug_taken' }
    }
    return { data: null, error: 'Failed to update learning path.' }
  }

  return { data: data as LearningPath, error: null }
}

/**
 * Toggle the active status of a learning path.
 */
export async function toggleLearningPathStatus(id: string, isActive: boolean): Promise<DataResult<LearningPath>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: 'Failed to update learning path status.' }
  }

  return { data: data as LearningPath, error: null }
}
