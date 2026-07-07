'use server'

import { createClient } from '@/lib/supabase/server'

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
}

/**
 * Fetch active learning paths for tester Academy view.
 */
export async function getPublishedLearningPaths(): Promise<DataResult<LearningPath[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_paths')
    .select('id, title, description, slug, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return { data: null, error: 'Failed to load learning paths.' }
  }

  return { data: data as LearningPath[], error: null }
}
