'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import type { Database } from '@/types/database.types'
import { isCurriculumSchemaError } from '@/lib/curriculum/schema-status'

// ── Types ────────────────────────────────────────────────────────────────────

type LearningPath = Database['public']['Tables']['learning_paths']['Row']
type LearningModule = Database['public']['Tables']['learning_modules']['Row']
type Lesson = Database['public']['Tables']['lessons']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']

export interface CurriculumChallenge {
  id: string
  title: string
  title_en: string | null
  title_ar: string | null
  difficulty: string
  base_xp_reward: number
  is_active: boolean | null
  module_id: string | null
  sort_order: number
}

export interface CurriculumLesson {
  archived_at?: string | null
  id: string
  title_en: string | null
  title_ar: string | null
  slug: string
  summary_en?: string | null
  summary_ar?: string | null
  content_en?: string | null
  content_ar?: string | null
  objectives_en?: string[]
  objectives_ar?: string[]
  estimated_minutes: number
  difficulty: string
  sort_order: number
  is_published: boolean
  module_id: string | null
  learning_path_id: string
}

export interface CurriculumModule {
  archived_at?: string | null
  id: string
  title_en: string
  title_ar: string | null
  description_en: string | null
  description_ar: string | null
  slug: string
  sort_order: number
  is_published: boolean
  learning_path_id: string
  lessons: CurriculumLesson[]
  challenges: CurriculumChallenge[]
}

export interface CurriculumPath {
  archived_at?: string | null
  id: string
  title_en: string | null
  title_ar: string | null
  description_en: string | null
  description_ar: string | null
  slug: string
  is_active: boolean
  sort_order: number
  created_at: string
  modules: CurriculumModule[]
}

export interface CurriculumStats {
  totalPaths: number
  totalModules: number
  totalLessons: number
  totalChallenges: number
  published: number
  drafts: number
}

interface Result<T> {
  data: T | null
  error: string | null
}

// ── Fetch full curriculum tree ───────────────────────────────────────────────

export async function getCurriculumTree(): Promise<Result<{ paths: CurriculumPath[]; stats: CurriculumStats; requiresMigration: boolean }>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()

    // Fetch all data in parallel
    const [pathsRes, modulesRes, lessonsRes, challengesRes, schemaRes] = await Promise.all([
      supabase.from('learning_paths').select('*').order('sort_order', { ascending: true }),
      supabase.from('learning_modules').select('*').order('sort_order', { ascending: true }),
      // SELECT * works on both the legacy schema and migration 034. Archive
      // metadata is optional until migration 034 has actually been applied.
      supabase.from('lessons').select('*').order('sort_order', { ascending: true }).order('slug'),
      supabase.from('challenges').select('id, title, title_en, title_ar, difficulty, base_xp_reward, is_active, module_id, sort_order').order('sort_order', { ascending: true }),
      // This stable RPC only reads an empty path; HEAD avoids downloading a
      // second copy of all lesson content just to check database readiness.
      supabase.rpc('curriculum_path_status', { p_path: '00000000-0000-0000-0000-000000000000' }, { head: true }),
    ])

    if (pathsRes.error) throw pathsRes.error
    if (modulesRes.error) throw modulesRes.error
    if (lessonsRes.error) throw lessonsRes.error
    if (challengesRes.error) throw challengesRes.error
    if (schemaRes.error && !isCurriculumSchemaError(schemaRes.error)) throw schemaRes.error

    const allPaths = (pathsRes.data ?? []) as LearningPath[]
    const allModules = (modulesRes.data ?? []) as LearningModule[]
    const allLessons = (lessonsRes.data ?? []) as Lesson[]
    const allChallenges = (challengesRes.data ?? []) as Challenge[]

    // Group modules by learning_path_id
    const modulesByPath = new Map<string, LearningModule[]>()
    for (const mod of allModules) {
      const list = modulesByPath.get(mod.learning_path_id) ?? []
      list.push(mod)
      modulesByPath.set(mod.learning_path_id, list)
    }

    // Group lessons by module_id
    const lessonsByModule = new Map<string, CurriculumLesson[]>()
    for (const lesson of allLessons) {
      if (lesson.module_id) {
        const list = lessonsByModule.get(lesson.module_id) ?? []
        list.push({
          id: lesson.id,
          archived_at: lesson.archived_at ?? null,
          title_en: lesson.title_en,
          title_ar: lesson.title_ar,
          slug: lesson.slug,
          summary_en: lesson.summary_en,
          summary_ar: lesson.summary_ar,
          content_en: lesson.content_en,
          content_ar: lesson.content_ar,
          objectives_en: lesson.objectives_en,
          objectives_ar: lesson.objectives_ar,
          estimated_minutes: lesson.estimated_minutes,
          difficulty: lesson.difficulty,
          sort_order: lesson.sort_order,
          is_published: lesson.is_published,
          module_id: lesson.module_id,
          learning_path_id: lesson.learning_path_id,
        })
        lessonsByModule.set(lesson.module_id, list)
      }
    }

    // Group challenges by module_id
    const challengesByModule = new Map<string, CurriculumChallenge[]>()
    for (const ch of allChallenges) {
      if (ch.module_id) {
        const list = challengesByModule.get(ch.module_id) ?? []
        list.push({
          id: ch.id,
          title: ch.title,
          title_en: ch.title_en,
          title_ar: ch.title_ar,
          difficulty: ch.difficulty,
          base_xp_reward: ch.base_xp_reward,
          is_active: ch.is_active,
          module_id: ch.module_id,
          sort_order: ch.sort_order,
        })
        challengesByModule.set(ch.module_id, list)
      }
    }

    // Build tree
    const paths: CurriculumPath[] = allPaths.map((path) => {
      const pathModules = modulesByPath.get(path.id) ?? []
      const modules: CurriculumModule[] = pathModules.map((mod) => ({
        id: mod.id,
        archived_at: mod.archived_at ?? null,
        title_en: mod.title_en,
        title_ar: mod.title_ar,
        description_en: mod.description_en,
        description_ar: mod.description_ar,
        slug: mod.slug,
        sort_order: mod.sort_order,
        is_published: mod.is_published,
        learning_path_id: mod.learning_path_id,
        lessons: lessonsByModule.get(mod.id) ?? [],
        challenges: challengesByModule.get(mod.id) ?? [],
      }))

      return {
        id: path.id,
        archived_at: path.archived_at ?? null,
        title_en: path.title_en,
        title_ar: path.title_ar,
        description_en: path.description_en,
        description_ar: path.description_ar,
        slug: path.slug,
        is_active: path.is_active,
        sort_order: path.sort_order,
        created_at: path.created_at,
        modules,
      }
    })

    // Compute stats
    let publishedCount = 0
    let draftCount = 0
    for (const p of allPaths) { if (p.is_active) publishedCount++; else draftCount++ }
    for (const m of allModules) { if (m.is_published) publishedCount++; else draftCount++ }
    for (const l of allLessons) { if (l.is_published) publishedCount++; else draftCount++ }
    for (const c of allChallenges) { if (c.is_active) publishedCount++; else draftCount++ }

    const stats: CurriculumStats = {
      totalPaths: allPaths.length,
      totalModules: allModules.length,
      totalLessons: allLessons.length,
      totalChallenges: allChallenges.length,
      published: publishedCount,
      drafts: draftCount,
    }

    return { data: { paths, stats, requiresMigration: !!schemaRes.error }, error: null }
  } catch (err: any) {
    console.error('getCurriculumTree error:', err)
    return { data: null, error: err.message || 'Failed to load curriculum.' }
  }
}

export async function setCurriculumState(kind: 'path' | 'module' | 'lesson', id: string, state: 'draft' | 'published' | 'archived'): Promise<Result<null>> {
  await requireAdmin('en')
  const supabase = await createClient()
  const { error } = await supabase.rpc('curriculum_set_state', { p_kind: kind, p_id: id, p_state: state })
  return { data: null, error: error?.message ?? null }
}

// ── Reorder Actions ──────────────────────────────────────────────────────────

export async function reorderPaths(orderedIds: string[]): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('curriculum_reorder', { p_kind: 'path', p_ids: orderedIds })
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('reorderPaths error:', err)
    return { data: null, error: err.message || 'Failed to reorder paths.' }
  }
}

export async function reorderModules(orderedIds: string[]): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('curriculum_reorder', { p_kind: 'module', p_ids: orderedIds })
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('reorderModules error:', err)
    return { data: null, error: err.message || 'Failed to reorder modules.' }
  }
}

export async function reorderLessons(orderedIds: string[]): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('curriculum_reorder', { p_kind: 'lesson', p_ids: orderedIds })
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('reorderLessons error:', err)
    return { data: null, error: err.message || 'Failed to reorder lessons.' }
  }
}

// ── Delete Actions ───────────────────────────────────────────────────────────

export async function deleteLearningPath(id: string): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('learning_paths').update({ is_active: false }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('deleteLearningPath error:', err)
    return { data: null, error: err.message || 'Failed to delete learning path.' }
  }
}

export async function deleteModule(id: string): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('learning_modules').update({ is_published: false }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('deleteModule error:', err)
    return { data: null, error: err.message || 'Failed to delete module.' }
  }
}

export async function deleteLesson(id: string): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('lessons').update({ is_published: false }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('deleteLesson error:', err)
    return { data: null, error: err.message || 'Failed to delete lesson.' }
  }
}

// ── Toggle Publish Actions ───────────────────────────────────────────────────

export async function togglePathActive(id: string, isActive: boolean): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('learning_paths').update({ is_active: isActive }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to toggle path status.' }
  }
}

export async function toggleModulePublished(id: string, isPublished: boolean): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('learning_modules').update({ is_published: isPublished }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to toggle module status.' }
  }
}

export async function toggleLessonPublished(id: string, isPublished: boolean): Promise<Result<null>> {
  await requireAdmin('en')
  try {
    const supabase = await createClient()
    if (isPublished) {
      const { error } = await supabase.rpc('curriculum_publish', { p_lesson: id, p_acknowledged: true })
      return { data: null, error: error?.message || null }
    }
    const { error } = await supabase.from('lessons').update({ is_published: isPublished }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to toggle lesson status.' }
  }
}
