import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ChallengeAttempt = Database['public']['Tables']['challenge_attempts']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']
type HiddenBug = Database['public']['Tables']['hidden_bugs']['Row']

export interface ReviewQueueItem {
  id: string
  challengeId: string
  testerUsername: string
  challengeTitle: string
  reportsCount: number
  status: string
  submittedAt: string | null
  score: number | null
  earnedXp: number | null
  isPassed: boolean | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function getAdminReviewQueue(): Promise<Result<ReviewQueueItem[]>> {
  try {
    const supabase = await createClient()

    // We fetch ALL challenge_attempts. For the queue, usually we want to see 'pending' or 'needs_improvement' at the top.
    // For this MVP, we fetch all attempts and let the client sort/filter, or just fetch top 100.
    const { data: attempts, error } = await supabase
      .from('challenge_attempts')
      .select(`
        id,
        challenge_id,
        status,
        submitted_at,
        score,
        earned_xp,
        is_passed,
        profiles!challenge_attempts_user_id_fkey ( username ),
        challenges!challenge_attempts_challenge_id_fkey ( title ),
        bug_reports ( count )
      `)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) {
      console.error('getAdminReviewQueue error:', error)
      return { data: null, error: 'Failed to fetch review queue.' }
    }

    const queue: ReviewQueueItem[] = (attempts ?? []).map((attempt: any) => ({
      id: attempt.id,
      challengeId: attempt.challenge_id,
      testerUsername: attempt.profiles?.username ?? 'Unknown',
      challengeTitle: attempt.challenges?.title ?? 'Unknown Challenge',
      reportsCount: attempt.bug_reports?.[0]?.count ?? 0,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      score: attempt.score,
      earnedXp: attempt.earned_xp,
      isPassed: attempt.is_passed,
    }))

    return { data: queue, error: null }
  } catch (error) {
    console.error('getAdminReviewQueue unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
