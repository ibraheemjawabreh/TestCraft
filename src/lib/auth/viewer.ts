import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Both functions memoize only within one React server render.
export const getVerifiedViewer = cache(async () => {
  try {
    const db = await createClient()
    const { data, error } = await db.auth.getUser()
    return !error && data.user ? { db, user: data.user } : null
  } catch {
    return null
  }
})

export const getViewerProfile = cache(async () => {
  const viewer = await getVerifiedViewer()
  if (!viewer) return null

  const { data: profile, error } = await viewer.db.from('profiles')
    .select('username,role,avatar_url,total_xp')
    .eq('id', viewer.user.id)
    .single()
  return { ...viewer, profile: error ? null : profile }
})
