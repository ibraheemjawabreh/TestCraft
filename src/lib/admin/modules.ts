'use server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import type { Database } from '@/types/database.types'

type LearningModule = Database['public']['Tables']['learning_modules']['Row']
type InsertModule = Database['public']['Tables']['learning_modules']['Insert']
type UpdateModule = Database['public']['Tables']['learning_modules']['Update']

interface Result<T> {
  data: T | null
  error: string | null
}

export async function getAdminModules(): Promise<Result<(LearningModule & { learning_paths: { title_en: string; title_ar: string | null } | null })[]>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('learning_modules')
      .select('*, learning_paths(title_en, title_ar)')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return { data: data as any, error: null }
  } catch (err: any) {
    console.error('getAdminModules error:', err)
    return { data: null, error: err.message || 'Failed to fetch modules' }
  }
}

export async function getAdminModule(id: string): Promise<Result<LearningModule>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('learning_modules')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (err: any) {
    console.error('getAdminModule error:', err)
    return { data: null, error: err.message || 'Failed to fetch module' }
  }
}

export async function createAdminModule(moduleData: InsertModule): Promise<Result<LearningModule>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()

    // Auto-assign sort_order as max within the same learning_path + 1
    let sortOrder = moduleData.sort_order
    if (!sortOrder || sortOrder <= 0) {
      const { data: maxRow } = await supabase
        .from('learning_modules')
        .select('sort_order')
        .eq('learning_path_id', moduleData.learning_path_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      sortOrder = ((maxRow?.sort_order ?? 0) as number) + 1
    }

    const { data, error } = await supabase
      .from('learning_modules')
      .insert({ ...moduleData, sort_order: sortOrder })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return { data: null, error: 'slug_taken' }
      throw error
    }

    return { data, error: null }
  } catch (err: any) {
    console.error('createAdminModule error:', err)
    return { data: null, error: err.message || 'Failed to create module' }
  }
}

export async function updateAdminModule(id: string, moduleData: UpdateModule): Promise<Result<LearningModule>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('learning_modules')
      .update(moduleData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return { data: null, error: 'slug_taken' }
      throw error
    }

    return { data, error: null }
  } catch (err: any) {
    console.error('updateAdminModule error:', err)
    return { data: null, error: err.message || 'Failed to update module' }
  }
}
