import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

export type ChallengeAttempt = Database['public']['Tables']['challenge_attempts']['Row']

export interface ChallengeSubmissionRow extends ChallengeAttempt {
  tester_username: string
  tester_avatar_url: string | null
  reports_count: number
}

interface DataResult<T> {
  data: T | null
  error: string | null
}

export async function getAdminChallengeSubmissions(
  challengeId: string
): Promise<DataResult<ChallengeSubmissionRow[]>> {
  try {
    const supabase = await createClient()

    // We need to fetch challenge_attempts, join profiles, and count bug_reports.
    // Supabase JS allows joining multiple tables. We'll join profiles and bug_reports.
    const { data: attempts, error } = await supabase
      .from('challenge_attempts')
      .select(`
        *,
        profiles!challenge_attempts_user_id_fkey (
          username,
          avatar_url
        ),
        bug_reports ( id )
      `)
      .eq('challenge_id', challengeId)
      .order('submitted_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('getAdminChallengeSubmissions error:', error)
      return { data: null, error: 'Failed to load challenge submissions.' }
    }

    const rows: ChallengeSubmissionRow[] = (attempts || []).map((attempt: any) => {
      const profile = attempt.profiles || {}
      return {
        id: attempt.id,
        user_id: attempt.user_id,
        challenge_id: attempt.challenge_id,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        reviewed_at: attempt.reviewed_at,
        final_score: attempt.final_score,
        earned_xp: attempt.earned_xp,
        admin_feedback: attempt.admin_feedback,
        reviewed_by: attempt.reviewed_by,
        xp_awarded: attempt.xp_awarded,
        created_at: attempt.created_at,
        updated_at: attempt.updated_at,
        tester_username: profile.username || 'Unknown',
        tester_avatar_url: profile.avatar_url || null,
        reports_count: Array.isArray(attempt.bug_reports) ? attempt.bug_reports.length : 0,
      }
    })

    return { data: rows, error: null }
  } catch (error) {
    console.error('getAdminChallengeSubmissions unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
