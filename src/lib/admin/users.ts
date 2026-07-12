import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AdminUserItem {
  id: string
  username: string
  avatarUrl: string | null
  role: Profile['role']
  totalXp: number | null
  currentLevel: number | null
  createdAt: string | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function getAdminUsers(): Promise<Result<AdminUserItem[]>> {
  try {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role, total_xp, current_level, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAdminUsers error:', error)
      return { data: null, error: 'Failed to fetch users.' }
    }

    const formattedUsers: AdminUserItem[] = (users ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatar_url,
      role: u.role,
      totalXp: u.total_xp,
      currentLevel: u.current_level,
      createdAt: u.created_at,
    }))

    return { data: formattedUsers, error: null }
  } catch (error) {
    console.error('getAdminUsers unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
