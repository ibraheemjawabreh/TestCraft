'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

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
  id: string
  title_en: string | null
  title_ar: string | null
  slug: string
  estimated_minutes: number
  difficulty: string
  sort_order: number
  is_published: boolean
  module_id: string | null
  learning_path_id: string
}

export interface CurriculumModule {
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

export async function getCurriculumTree(): Promise<Result<{ paths: CurriculumPath[]; stats: CurriculumStats }>> {
  try {
    const supabase = await createClient()

    // Fetch all data in parallel
    const [pathsRes, modulesRes, lessonsRes, challengesRes] = await Promise.all([
      supabase.from('learning_paths').select('*').order('sort_order', { ascending: true }),
      supabase.from('learning_modules').select('*').order('sort_order', { ascending: true }),
      supabase.from('lessons').select('id, title_en, title_ar, slug, estimated_minutes, difficulty, sort_order, is_published, module_id, learning_path_id').order('sort_order', { ascending: true }),
      supabase.from('challenges').select('id, title, title_en, title_ar, difficulty, base_xp_reward, is_active, module_id, sort_order').order('sort_order', { ascending: true }),
    ])

    if (pathsRes.error) throw pathsRes.error
    if (modulesRes.error) throw modulesRes.error
    if (lessonsRes.error) throw lessonsRes.error
    if (challengesRes.error) throw challengesRes.error

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
          title_en: lesson.title_en,
          title_ar: lesson.title_ar,
          slug: lesson.slug,
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

    return { data: { paths, stats }, error: null }
  } catch (err: any) {
    console.error('getCurriculumTree error:', err)
    return { data: null, error: err.message || 'Failed to load curriculum.' }
  }
}

// ── Reorder Actions ──────────────────────────────────────────────────────────

export async function reorderPaths(orderedIds: string[]): Promise<Result<null>> {
  try {
    const supabase = await createClient()
    const updates = orderedIds.map((id, index) =>
      supabase.from('learning_paths').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return { data: null, error: null }
  } catch (err: any) {
    console.error('reorderPaths error:', err)
    return { data: null, error: err.message || 'Failed to reorder paths.' }
  }
}

export async function reorderModules(orderedIds: string[]): Promise<Result<null>> {
  try {
    const supabase = await createClient()
    const updates = orderedIds.map((id, index) =>
      supabase.from('learning_modules').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return { data: null, error: null }
  } catch (err: any) {
    console.error('reorderModules error:', err)
    return { data: null, error: err.message || 'Failed to reorder modules.' }
  }
}

export async function reorderLessons(orderedIds: string[]): Promise<Result<null>> {
  try {
    const supabase = await createClient()
    const updates = orderedIds.map((id, index) =>
      supabase.from('lessons').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return { data: null, error: null }
  } catch (err: any) {
    console.error('reorderLessons error:', err)
    return { data: null, error: err.message || 'Failed to reorder lessons.' }
  }
}

// ── Delete Actions ───────────────────────────────────────────────────────────

export async function deleteLearningPath(id: string): Promise<Result<null>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('learning_paths').delete().eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('deleteLearningPath error:', err)
    return { data: null, error: err.message || 'Failed to delete learning path.' }
  }
}

export async function deleteModule(id: string): Promise<Result<null>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('learning_modules').delete().eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('deleteModule error:', err)
    return { data: null, error: err.message || 'Failed to delete module.' }
  }
}

export async function deleteLesson(id: string): Promise<Result<null>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('lessons').delete().eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    console.error('deleteLesson error:', err)
    return { data: null, error: err.message || 'Failed to delete lesson.' }
  }
}

// ── Toggle Publish Actions ───────────────────────────────────────────────────

export async function togglePathActive(id: string, isActive: boolean): Promise<Result<null>> {
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
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('lessons').update({ is_published: isPublished }).eq('id', id)
    if (error) throw error
    return { data: null, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to toggle lesson status.' }
  }
}
