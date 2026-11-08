'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import type { LearningPathFormValues } from '@/lib/validations/learning-path'
import { learningPathSchema } from '@/lib/validations/learning-path'

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface LearningPath {
  id: string
  title_en: string | null
  title_ar: string | null
  description_en: string | null
  description_ar: string | null
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
  await requireAdmin('en')
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

  const pathsWithCounts: LearningPathWithLessonCount[] = (paths as any[]).map((p) => ({
    ...p,
    lessons_count: countMap.get(p.id) ?? 0,
  }))

  return { data: pathsWithCounts, error: null }
}

/**
 * Fetch a single learning path by ID for admin.
 */
export async function getAdminLearningPathById(id: string): Promise<DataResult<LearningPath>> {
  await requireAdmin('en')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Learning path not found.' }
  }

  return { data: data as any as LearningPath, error: null }
}

/**
 * Create a new learning path.
 * sort_order is auto-assigned as global max(sort_order) + 1.
 */
export async function createLearningPath(input: LearningPathFormValues): Promise<DataResult<LearningPath>> {
  await requireAdmin('en')
  input = learningPathSchema.parse(input)
  const supabase = await createClient()

  // Auto-assign sort_order as global max + 1
  const { data: maxRow } = await supabase
    .from('learning_paths')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = ((maxRow?.sort_order ?? 0) as number) + 1

  const { data, error } = await supabase
    .from('learning_paths')
    .insert({
      title_en: input.title_en,
      title_ar: input.title_ar,
      description_en: input.description_en,
      description_ar: input.description_ar,
      slug: input.slug,
      is_active: input.is_active,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('createLearningPath DB error:', JSON.stringify(error, null, 2))
    if (error.code === '23505') {
      return { data: null, error: 'slug_taken' }
    }
    return { data: null, error: `Failed to create learning path. DB: ${error.message} (${error.code})` }
  }

  return { data: data as any as LearningPath, error: null }
}

/**
 * Update an existing learning path.
 */
export async function updateLearningPath(id: string, input: LearningPathFormValues): Promise<DataResult<LearningPath>> {
  await requireAdmin('en')
  input = learningPathSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .update({
      title_en: input.title_en,
      title_ar: input.title_ar,
      description_en: input.description_en,
      description_ar: input.description_ar,
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

  return { data: data as any as LearningPath, error: null }
}

/**
 * Toggle the active status of a learning path.
 */
export async function toggleLearningPathStatus(id: string, isActive: boolean): Promise<DataResult<LearningPath>> {
  await requireAdmin('en')
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

  return { data: data as any as LearningPath, error: null }
}
