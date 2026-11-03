'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
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
  module_id: string | null
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
  module_title: string | null
}

/**
 * Fetch all lessons with learning path title and module title for admin.
 */
export async function getAdminLessons(locale: Locale = 'en'): Promise<DataResult<LessonWithPath[]>> {
  await requireAdmin('en')
  const supabase = await createClient()

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title_en, title_ar ),
      learning_modules ( title_en, title_ar )
    `)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  const mapped: LessonWithPath[] = (lessons ?? []).map((row) => {
    const pathData = row.learning_paths as any
    const pathTitle = pathData ? getLocalizedContent(pathData, 'title', locale) : null

    const moduleData = row.learning_modules as any
    const moduleTitle = moduleData ? getLocalizedContent(moduleData, 'title', locale) : null

    return {
      id: row.id,
      learning_path_id: row.learning_path_id,
      module_id: row.module_id,
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
      module_title: moduleTitle,
    }
  })

  return { data: mapped, error: null }
}

/**
 * Fetch a single lesson by ID for admin.
 */
export async function getAdminLessonById(id: string, locale: Locale = 'en'): Promise<DataResult<LessonWithPath>> {
  await requireAdmin('en')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      learning_paths ( title_en, title_ar ),
      learning_modules ( title_en, title_ar )
    `)
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Lesson not found.' }
  }

  const pathData = data.learning_paths as any
  const pathTitle = pathData ? getLocalizedContent(pathData, 'title', locale) : null

  const moduleData = data.learning_modules as any
  const moduleTitle = moduleData ? getLocalizedContent(moduleData, 'title', locale) : null

  return {
    data: {
      id: data.id,
      learning_path_id: data.learning_path_id,
      module_id: data.module_id,
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
      module_title: moduleTitle,
    },
    error: null,
  }
}

/**
 * Create a new lesson.
 * sort_order is auto-assigned as max(sort_order) + 1 within the same module
 * (or learning_path if no module) if not explicitly given.
 */
export async function createLesson(input: LessonFormValues): Promise<DataResult<Lesson>> {
  await requireAdmin('en')
  const supabase = await createClient()

  let sortOrder = input.sort_order
  if (sortOrder === undefined || sortOrder === null || sortOrder === 0) {
    let sortOrderQuery = supabase
      .from('lessons')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    if (input.module_id) {
      sortOrderQuery = sortOrderQuery.eq('module_id', input.module_id)
    } else {
      sortOrderQuery = sortOrderQuery.eq('learning_path_id', input.learning_path_id)
    }

    const { data: maxRow } = await sortOrderQuery.maybeSingle()
    sortOrder = ((maxRow?.sort_order ?? 0) as number) + 1
  }

  // Ensure unique slug fallback if empty
  const slug = input.slug?.trim() || `lesson-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      learning_path_id: input.learning_path_id,
      module_id: input.module_id || null,
      title: input.title_en || input.title_ar || 'Untitled Lesson',
      content: input.content_en || input.content_ar || '',
      title_en: input.title_en || null,
      title_ar: input.title_ar || null,
      slug,
      summary_en: input.summary_en || null,
      summary_ar: input.summary_ar || null,
      content_en: input.content_en || null,
      content_ar: input.content_ar || null,
      objectives_en: input.objectives_en,
      objectives_ar: input.objectives_ar,
      estimated_minutes: input.estimated_minutes,
      difficulty: input.difficulty,
      sort_order: sortOrder,
      is_published: input.is_published,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'slug_taken' }
    }
    return { data: null, error: error.message || 'Failed to create lesson.' }
  }

  return { data: data as any as Lesson, error: null }
}

/**
 * Update an existing lesson.
 */
export async function updateLesson(id: string, input: LessonFormValues): Promise<DataResult<Lesson>> {
  await requireAdmin('en')
  const supabase = await createClient()

  const slug = input.slug?.trim() || `lesson-${Date.now().toString(36)}`

  const { data, error } = await supabase
    .from('lessons')
    .update({
      learning_path_id: input.learning_path_id,
      module_id: input.module_id || null,
      title: input.title_en || input.title_ar || 'Untitled Lesson',
      content: input.content_en || input.content_ar || '',
      title_en: input.title_en || null,
      title_ar: input.title_ar || null,
      slug,
      summary_en: input.summary_en || null,
      summary_ar: input.summary_ar || null,
      content_en: input.content_en || null,
      content_ar: input.content_ar || null,
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
    return { data: null, error: error.message || 'Failed to update lesson.' }
  }

  return { data: data as any as Lesson, error: null }
}

/**
 * Toggle the published status of a lesson.
 */
export async function toggleLessonPublished(id: string, isPublished: boolean): Promise<DataResult<Lesson>> {
  await requireAdmin('en')
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

/**
 * Duplicate an existing lesson into a new Draft lesson.
 */
export async function duplicateLesson(id: string): Promise<DataResult<Lesson>> {
  await requireAdmin('en')
  const supabase = await createClient()

  // 1. Fetch source lesson
  const { data: source, error: fetchError } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !source) {
    return { data: null, error: 'Source lesson not found.' }
  }

  // 2. Determine sort_order
  let sortOrderQuery = supabase
    .from('lessons')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (source.module_id) {
    sortOrderQuery = sortOrderQuery.eq('module_id', source.module_id)
  } else {
    sortOrderQuery = sortOrderQuery.eq('learning_path_id', source.learning_path_id)
  }

  const { data: maxRow } = await sortOrderQuery.maybeSingle()
  const newSortOrder = ((maxRow?.sort_order ?? 0) as number) + 1

  // 3. Generate unique slug and title with Copy indicator
  const titleEn = source.title_en ? `${source.title_en} (Copy)` : 'Untitled Lesson (Copy)'
  const titleAr = source.title_ar ? `${source.title_ar} (نسخة)` : 'درس بدون عنوان (نسخة)'
  const slug = `${source.slug || 'lesson'}-copy-${Date.now().toString(36)}`

  // 4. Insert new draft lesson
  const { data: newLesson, error: insertError } = await supabase
    .from('lessons')
    .insert({
      learning_path_id: source.learning_path_id,
      module_id: source.module_id,
      title: titleEn,
      content: source.content || source.content_en || '',
      title_en: titleEn,
      title_ar: titleAr,
      slug,
      summary_en: source.summary_en,
      summary_ar: source.summary_ar,
      content_en: source.content_en,
      content_ar: source.content_ar,
      objectives_en: source.objectives_en || [],
      objectives_ar: source.objectives_ar || [],
      estimated_minutes: source.estimated_minutes,
      difficulty: source.difficulty,
      sort_order: newSortOrder,
      is_published: false, // Always Draft
    })
    .select()
    .single()

  if (insertError) {
    return { data: null, error: insertError.message || 'Failed to duplicate lesson.' }
  }

  return { data: newLesson as any as Lesson, error: null }
}

/**
 * Delete a lesson by ID.
 */
export async function deleteLesson(id: string): Promise<DataResult<null>> {
  await requireAdmin('en')
  const supabase = await createClient()

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: error.message || 'Failed to delete lesson.' }
  }

  return { data: null, error: null }
}

