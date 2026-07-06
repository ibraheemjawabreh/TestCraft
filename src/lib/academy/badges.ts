import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Badge = Database['public']['Tables']['badges']['Row']
type UserBadge = Database['public']['Tables']['user_badges']['Row']

export interface UserBadgeWithDetails extends UserBadge {
  name: string
  description: string
  icon_url: string | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Fetches the tester's earned badges joined with badge details.
 */
export async function getTesterBadges(
  userId: string,
): Promise<Result<UserBadgeWithDetails[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        user_id,
        badge_id,
        earned_at,
        badges (
          name,
          description,
          icon_url
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) {
      return { data: null, error: 'Failed to load badges.' }
    }

    const badges: UserBadgeWithDetails[] = (data ?? []).map((row) => {
      const badge = Array.isArray(row.badges)
        ? (row.badges[0] as Badge | undefined)
        : (row.badges as Badge | null)

      return {
        user_id: row.user_id,
        badge_id: row.badge_id,
        earned_at: row.earned_at,
        name: badge?.name ?? '',
        description: badge?.description ?? '',
        icon_url: badge?.icon_url ?? null,
      }
    })

    return { data: badges, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
