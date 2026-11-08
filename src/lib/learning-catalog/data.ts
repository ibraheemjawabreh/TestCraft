import 'server-only'
import { cache } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const id = z.string().regex(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i)
const text = z.string().nullable()
const title = { title_en: text, title_ar: text }
const description = { description_en: text, description_ar: text }
const lesson = z.object({ id, ...title, title: text, estimated_minutes: z.number().int().nonnegative().nullable() })
const catalog = z.array(z.object({
  id, slug: z.string(), ...title, title: text, ...description, description: text,
  module_count: z.number().int().nonnegative(), lesson_count: z.number().int().nonnegative(),
  modules: z.array(z.object({ id, ...title, ...description, lessons: z.array(lesson) })),
}))
const study = z.object({ lesson_id: id.nullable(), started: z.boolean(), completed: z.array(id), available: z.array(id) })
export type CatalogPath = z.infer<typeof catalog>[number]
export type PathStudy = z.infer<typeof study>

// This client never reads request cookies. Even a signed-in admin sees the
// same published projection as a visitor. No persistent cache of visibility.
export const readCatalog = cache(async (slug: string | null = null) => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    const client = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    })
    const { data, error } = await client.rpc('curriculum_public_catalog', { p_slug: slug })
    const parsed = catalog.safeParse(data)
    return !error && parsed.success ? parsed.data : null
  } catch {
    return null
  }
})

// Request-scoped only, shared by the header and the path details page.
export const getPublicViewer = cache(async () => {
  try {
    const db = await createClient()
    const { data, error } = await db.auth.getUser()
    return !error && data.user ? { db } : null
  } catch {
    return null
  }
})

export async function readPathStudy(slug: string | null, db?: Awaited<ReturnType<typeof createClient>>) {
  try {
    const client = db ?? await createClient()
    const { data, error } = await client.rpc('curriculum_path_study', { p_slug: slug })
    const parsed = study.safeParse(data)
    return !error && parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
