import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { getLocalizedContent } from '@/lib/i18n/content'
import type { Locale } from '@/i18n/config'

type LabTemplate = Database['public']['Tables']['lab_templates']['Row']

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface LabTemplateOption {
  id: string
  name: string
  slug: string
  is_active: boolean
}

/**
 * Fetch all lab templates (admin only).
 */
export async function getAdminLabTemplates(): Promise<DataResult<LabTemplate[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_templates')
    .select('*')
    .order('name_en', { ascending: true })

  if (error) {
    return { data: null, error: 'Failed to load lab templates.' }
  }
  return { data, error: null }
}

/**
 * Fetch a single lab template by ID (admin only).
 */
export async function getAdminLabTemplateById(id: string): Promise<DataResult<LabTemplate>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Lab template not found.' }
  }
  return { data, error: null }
}

/**
 * Create a new lab template (admin only).
 */
export async function createLabTemplate(input: {
  name_en: string
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  slug: string
  lab_type: string
  is_active: boolean
}): Promise<DataResult<LabTemplate>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_templates')
    .insert(input)
    .select()
    .single()

  if (error) {
    console.error('Lab Template Creation Error:', error)
    return { data: null, error: `Failed to create lab template: ${error.message}` }
  }
  return { data, error: null }
}

/**
 * Update an existing lab template (admin only).
 */
export async function updateLabTemplate(
  id: string,
  input: Partial<{
    name_en: string
    name_ar: string | null
    description_en: string | null
    description_ar: string | null
    slug: string
    lab_type: string
    is_active: boolean
  }>
): Promise<DataResult<LabTemplate>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_templates')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: `Failed to update lab template: ${error.message}` }
  }
  return { data, error: null }
}

/**
 * Toggle active status.
 */
export async function toggleLabTemplateStatus(
  id: string,
  isActive: boolean
): Promise<DataResult<LabTemplate>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_templates')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: 'Failed to update status.' }
  }
  return { data, error: null }
}

/**
 * Fetch active lab templates as options for a form select (admin + tester safe).
 */
export async function getLabTemplateOptions(locale: Locale): Promise<DataResult<LabTemplateOption[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_templates')
    .select('id, name_en, name_ar, slug, is_active')
    .eq('is_active', true)
    .order('name_en', { ascending: true })

  if (error) {
    return { data: null, error: 'Failed to load lab template options.' }
  }

  const options: LabTemplateOption[] = (data ?? []).map((t) => ({
    id: t.id,
    name: locale === 'ar' && t.name_ar ? t.name_ar : t.name_en,
    slug: t.slug,
    is_active: t.is_active,
  }))

  return { data: options, error: null }
}
