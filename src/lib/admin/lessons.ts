'use server'

import { createClient } from '@/lib/supabase/server'
import type { LessonFormValues } from '@/lib/validations/lesson'
import { getLocalizedContent } from '@/lib/i18n/content'
import { Locale } from '@/i18n/config'

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface Lesson {
  id: string
  learning_path_id: string
  title_en: string | null
  title_ar: string | null
  slug: string
  summary_en: string | null
  summary_ar: string | null
  content_en: string | null
  content_ar: string | null
  objectives_en: string[]
  objectives_ar: string[]
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
export async function getAdminLessons(locale: Locale = 'en'): Promise<DataResult<LessonWithPath[]>> {
  const supabase = await createClient()

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title_en, title_ar )
    `)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  const mapped: LessonWithPath[] = (lessons ?? []).map((row) => {
    const pathData = row.learning_paths as any
    const pathTitle = pathData ? getLocalizedContent(pathData, 'title', locale) : null

    return {
      id: row.id,
      learning_path_id: row.learning_path_id,
      title_en: row.title_en,
      title_ar: row.title_ar,
      slug: row.slug,
      summary_en: row.summary_en,
      summary_ar: row.summary_ar,
      content_en: row.content_en,
      content_ar: row.content_ar,
      objectives_en: row.objectives_en || [],
      objectives_ar: row.objectives_ar || [],
      estimated_minutes: row.estimated_minutes,
      difficulty: row.difficulty,
      sort_order: row.sort_order,
      is_published: row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
      learning_path_title: pathTitle,
    }
  })

  return { data: mapped, error: null }
}

/**
 * Fetch a single lesson by ID for admin.
 */
export async function getAdminLessonById(id: string, locale: Locale = 'en'): Promise<DataResult<LessonWithPath>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title_en, title_ar )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Lesson not found.' }
  }

  const pathData = data.learning_paths as any
  const pathTitle = pathData ? getLocalizedContent(pathData, 'title', locale) : null

  return {
    data: {
      id: data.id,
      learning_path_id: data.learning_path_id,
      title_en: data.title_en,
      title_ar: data.title_ar,
      slug: data.slug,
      summary_en: data.summary_en,
      summary_ar: data.summary_ar,
      content_en: data.content_en,
      content_ar: data.content_ar,
      objectives_en: data.objectives_en || [],
      objectives_ar: data.objectives_ar || [],
      estimated_minutes: data.estimated_minutes,
      difficulty: data.difficulty,
      sort_order: data.sort_order,
      is_published: data.is_published,
      created_at: data.created_at,
      updated_at: data.updated_at,
      learning_path_title: pathTitle,
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
      title_en: input.title_en,
      title_ar: input.title_ar,
      slug: input.slug,
      summary_en: input.summary_en || null,
      summary_ar: input.summary_ar || null,
      content_en: input.content_en,
      content_ar: input.content_ar,
      objectives_en: input.objectives_en,
      objectives_ar: input.objectives_ar,
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

  return { data: data as any as Lesson, error: null }
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
      title_en: input.title_en,
      title_ar: input.title_ar,
      slug: input.slug,
      summary_en: input.summary_en || null,
      summary_ar: input.summary_ar || null,
      content_en: input.content_en,
      content_ar: input.content_ar,
      objectives_en: input.objectives_en,
      objectives_ar: input.objectives_ar,
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

  return { data: data as any as Lesson, error: null }
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

  return { data: data as any as Lesson, error: null }
}
