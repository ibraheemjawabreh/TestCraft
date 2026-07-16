import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import type { AttemptStatus } from '@/types/database'

type BugReport = Database['public']['Tables']['bug_reports']['Row']
type ChallengeAttempt = Database['public']['Tables']['challenge_attempts']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']
type HiddenBug = Database['public']['Tables']['hidden_bugs']['Row']

export interface AttemptReviewData {
  attempt: ChallengeAttempt
  tester: Pick<Profile, 'username' | 'avatar_url' | 'current_level' | 'total_xp'>
  challenge: Pick<Challenge, 'title' | 'scenario' | 'instructions' | 'base_xp_reward'>
  reports: BugReport[]
  hiddenBugs: Pick<HiddenBug, 'bug_title' | 'actual_severity' | 'bonus_xp'>[]
}

interface DataResult<T> {
  data: T | null
  error: string | null
}

export async function getAdminAttemptReview(
  challengeId: string,
  attemptId: string
): Promise<DataResult<AttemptReviewData>> {
  try {
    const supabase = await createClient()

    const { data: attempt, error: attemptError } = await supabase
      .from('challenge_attempts')
      .select(`
        *,
        profiles!challenge_attempts_user_id_fkey (
          username,
          avatar_url,
          current_level,
          total_xp
        ),
        challenges!challenge_attempts_challenge_id_fkey (
          title,
          scenario,
          instructions,
          base_xp_reward
        )
      `)
      .eq('id', attemptId)
      .eq('challenge_id', challengeId)
      .single()

    if (attemptError || !attempt) {
      console.error('getAdminAttemptReview error:', attemptError)
      return { data: null, error: 'Attempt not found.' }
    }

    const { data: reports, error: reportsError } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })

    if (reportsError) {
      return { data: null, error: 'Failed to fetch bug reports.' }
    }

    const { data: hiddenBugs, error: bugsError } = await supabase
      .from('hidden_bugs')
      .select('bug_title, actual_severity, bonus_xp')
      .eq('challenge_id', challengeId)

    if (bugsError) {
      return { data: null, error: 'Failed to fetch hidden bugs.' }
    }

    return {
      data: {
        attempt: {
          id: attempt.id,
          user_id: attempt.user_id,
          challenge_id: attempt.challenge_id,
          status: attempt.status,
          started_at: attempt.started_at,
          submitted_at: attempt.submitted_at,
          review_started_at: attempt.review_started_at,
          reviewed_at: attempt.reviewed_at,
          reviewed_by: attempt.reviewed_by,
          score: attempt.score,
          earned_xp: attempt.earned_xp,
          admin_feedback: attempt.admin_feedback,
          time_spent_seconds: attempt.time_spent_seconds,
          is_passed: attempt.is_passed,
          created_at: attempt.created_at,
          updated_at: attempt.updated_at,
        },
        tester: attempt.profiles as any,
        challenge: attempt.challenges as any,
        reports: reports || [],
        hiddenBugs: hiddenBugs || [],
      },
      error: null,
    }
  } catch (error) {
    console.error('getAdminAttemptReview unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

export interface SaveReviewInput {
  attemptId: string
  challengeId: string
  status: Extract<AttemptStatus, 'approved' | 'rejected'>
  score: number
  earnedXp: number
  adminFeedback: string
  isPassed: boolean
  reportUpdates: { id: string; status: 'Pending' | 'Reviewed' | 'Rejected' }[]
}

export async function saveAdminAttemptReview(input: SaveReviewInput): Promise<DataResult<boolean>> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { data: null, error: 'Unauthorized.' }
    }

    // Fetch the attempt to verify it exists and get the user_id for XP award
    const { data: attempt, error: attemptError } = await supabase
      .from('challenge_attempts')
      .select('user_id, status, is_passed')
      .eq('id', input.attemptId)
      .eq('challenge_id', input.challengeId)
      .single()

    if (attemptError || !attempt) {
      return { data: null, error: 'Attempt not found.' }
    }

    // Prevent re-reviewing already-terminal attempts (idempotent protection)
    const alreadyReviewed = attempt.status === 'approved' || attempt.status === 'rejected'
    const shouldAwardXp = input.status === 'approved' && !alreadyReviewed && !attempt.is_passed

    const now = new Date().toISOString()

    // 1. Update bug report statuses
    if (input.reportUpdates.length > 0) {
      const reportUpdateResults = await Promise.all(
        input.reportUpdates.map((ru) => {
          let finalStatus = ru.status
          if (finalStatus === 'Pending') {
            finalStatus = input.status === 'approved' ? 'Reviewed' : 'Rejected'
          }

          return supabase
            .from('bug_reports')
            .update({ status: finalStatus })
            .eq('id', ru.id)
            .eq('attempt_id', input.attemptId)
        })
      )

      const reportUpdateError = reportUpdateResults.find((result) => result.error)?.error
      if (reportUpdateError) {
        console.error('Update bug report status error:', reportUpdateError)
        return { data: null, error: 'Failed to update report statuses.' }
      }
    }

    // 2. Mark the attempt as reviewed
    const { error: updateAttemptError } = await supabase
      .from('challenge_attempts')
      .update({
        status: input.status,
        score: input.score,
        earned_xp: input.earnedXp,
        admin_feedback: input.adminFeedback,
        is_passed: input.isPassed,
        reviewed_by: user.id,
        reviewed_at: now,
      })
      .eq('id', input.attemptId)
      .eq('challenge_id', input.challengeId)

    if (updateAttemptError) {
      console.error('Update attempt error:', updateAttemptError)
      return { data: null, error: 'Failed to update attempt.' }
    }

    // 3. Award XP if this is the first approval
    if (shouldAwardXp && input.earnedXp > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', attempt.user_id)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_xp: (profile.total_xp || 0) + input.earnedXp,
          })
          .eq('id', attempt.user_id)
      }
    }

    return { data: true, error: null }
  } catch (error) {
    console.error('saveAdminAttemptReview unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Marks an attempt as "reviewing" (admin has started reviewing it).
 */
export async function startAttemptReview(
  attemptId: string,
  challengeId: string,
): Promise<DataResult<boolean>> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('challenge_attempts')
      .update({
        status: 'reviewing',
        review_started_at: now,
      })
      .eq('id', attemptId)
      .eq('challenge_id', challengeId)
      .eq('status', 'submitted')

    if (error) {
      return { data: null, error: 'Failed to start review.' }
    }

    return { data: true, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
