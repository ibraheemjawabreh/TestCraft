import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AdminSettingsProfile {
  id: string
  username: string
  avatarUrl: string | null
  role: Profile['role']
  email: string | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function getAdminSettingsProfile(): Promise<Result<AdminSettingsProfile>> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: 'Failed to fetch admin profile.' }
    }

    return {
      data: {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        role: profile.role,
        email: user.email ?? null,
      },
      error: null,
    }
  } catch (error) {
    console.error('getAdminSettingsProfile unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
