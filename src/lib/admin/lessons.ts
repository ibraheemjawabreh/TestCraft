'use server'

import { createClient } from '@/lib/supabase/server'
import type { LessonFormValues } from '@/lib/validations/lesson'

interface DataResult<T> {
  data: T | null
  error: string | null
}

interface Lesson {
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
  created_at: string
  updated_at: string
}

export interface LessonWithPath extends Lesson {
  learning_path_title: string | null
}

/**
 * Fetch all lessons with learning path title for admin.
 */
export async function getAdminLessons(): Promise<DataResult<LessonWithPath[]>> {
  const supabase = await createClient()

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title )
    `)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  const mapped: LessonWithPath[] = (lessons ?? []).map((row) => {
    const pathData = row.learning_paths as { title: string } | null
    return {
      id: row.id,
      learning_path_id: row.learning_path_id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      objectives: row.objectives,
      estimated_minutes: row.estimated_minutes,
      difficulty: row.difficulty,
      sort_order: row.sort_order,
      is_published: row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
      learning_path_title: pathData?.title ?? null,
    }
  })

  return { data: mapped, error: null }
}

/**
 * Fetch a single lesson by ID for admin.
 */
export async function getAdminLessonById(id: string): Promise<DataResult<LessonWithPath>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Lesson not found.' }
  }

  const pathData = data.learning_paths as { title: string } | null

  return {
    data: {
      id: data.id,
      learning_path_id: data.learning_path_id,
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      content: data.content,
      objectives: data.objectives,
      estimated_minutes: data.estimated_minutes,
      difficulty: data.difficulty,
      sort_order: data.sort_order,
      is_published: data.is_published,
      created_at: data.created_at,
      updated_at: data.updated_at,
      learning_path_title: pathData?.title ?? null,
    },
    error: null,
  }
}

/**
 * Create a new lesson.
 */
export async function createLesson(input: LessonFormValues): Promise<DataResult<Lesson>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      learning_path_id: input.learning_path_id,
      title: input.title,
      slug: input.slug,
      summary: input.summary || null,
      content: input.content,
      objectives: input.objectives,
      estimated_minutes: input.estimated_minutes,
      difficulty: input.difficulty,
      sort_order: input.sort_order,
      is_published: input.is_published,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'slug_taken' }
    }
    return { data: null, error: 'Failed to create lesson.' }
  }

  return { data: data as Lesson, error: null }
}

/**
 * Update an existing lesson.
 */
export async function updateLesson(id: string, input: LessonFormValues): Promise<DataResult<Lesson>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .update({
      learning_path_id: input.learning_path_id,
      title: input.title,
      slug: input.slug,
      summary: input.summary || null,
      content: input.content,
      objectives: input.objectives,
      estimated_minutes: input.estimated_minutes,
      difficulty: input.difficulty,
      sort_order: input.sort_order,
      is_published: input.is_published,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'slug_taken' }
    }
    return { data: null, error: 'Failed to update lesson.' }
  }

  return { data: data as Lesson, error: null }
}

/**
 * Toggle the published status of a lesson.
 */
export async function toggleLessonPublished(id: string, isPublished: boolean): Promise<DataResult<Lesson>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .update({ is_published: isPublished })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: 'Failed to update lesson status.' }
  }

  return { data: data as Lesson, error: null }
}
