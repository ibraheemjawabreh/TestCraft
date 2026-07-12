import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

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

    // Fetch the attempt with the related user profile and challenge
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

    // Fetch the submitted bug reports for this attempt
    const { data: reports, error: reportsError } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })

    if (reportsError) {
      return { data: null, error: 'Failed to fetch bug reports.' }
    }

    // Fetch the hidden bugs for this challenge (Admin only view)
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
          reviewed_at: attempt.reviewed_at,
          final_score: attempt.final_score,
          earned_xp: attempt.earned_xp,
          admin_feedback: attempt.admin_feedback,
          reviewed_by: attempt.reviewed_by,
          xp_awarded: attempt.xp_awarded,
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
  status: 'approved' | 'needs_improvement' | 'rejected'
  finalScore: number
  earnedXp: number
  adminFeedback: string
  reportUpdates: { id: string; status: 'Pending' | 'Reviewed' | 'Rejected' }[]
}

export async function saveAdminAttemptReview(input: SaveReviewInput): Promise<DataResult<boolean>> {
  try {
    const supabase = await createClient()

    // 1. Get the current admin user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { data: null, error: 'Unauthorized.' }
    }

    // 2. Fetch the attempt to check current state (xp_awarded and user_id)
    const { data: attempt, error: attemptError } = await supabase
      .from('challenge_attempts')
      .select('user_id, xp_awarded')
      .eq('id', input.attemptId)
      .eq('challenge_id', input.challengeId)
      .single()

    if (attemptError || !attempt) {
      return { data: null, error: 'Attempt not found.' }
    }

    // 3. Begin updates. We do these sequentially for simplicity and safety.
    const now = new Date().toISOString()
    const isApproved = input.status === 'approved'
    const shouldAwardXp = isApproved && !attempt.xp_awarded

    // 4. Update bug report statuses before marking the attempt as reviewed.
    // A successful response must never leave the tester's reports as Pending.
    if (input.reportUpdates.length > 0) {
      const reportUpdateResults = await Promise.all(
        input.reportUpdates.map((ru) => {
          let finalStatus = ru.status
          // Auto-resolve pending reports based on overall attempt decision
          if (finalStatus === 'Pending') {
            if (isApproved) {
              finalStatus = 'Reviewed'
            } else if (input.status === 'rejected' || input.status === 'needs_improvement') {
              finalStatus = 'Rejected'
            }
          }

          return supabase
            .from('bug_reports')
            .update({ status: finalStatus })
            .eq('id', ru.id)
            .eq('attempt_id', input.attemptId) // security measure
        })
      )

      const reportUpdateError = reportUpdateResults.find((result) => result.error)?.error
      if (reportUpdateError) {
        console.error('Update bug report status error:', reportUpdateError)
        return { data: null, error: 'Failed to update report statuses.' }
      }
    }

    // 5. Mark the attempt as reviewed only after its reports are updated.
    const { error: updateAttemptError } = await supabase
      .from('challenge_attempts')
      .update({
        status: input.status,
        final_score: input.finalScore,
        earned_xp: input.earnedXp,
        admin_feedback: input.adminFeedback,
        reviewed_by: user.id,
        reviewed_at: now,
        xp_awarded: attempt.xp_awarded || shouldAwardXp,
      })
      .eq('id', input.attemptId)
      .eq('challenge_id', input.challengeId)

    if (updateAttemptError) {
      console.error('Update attempt error:', updateAttemptError)
      return { data: null, error: 'Failed to update attempt.' }
    }

    // 6. Award XP if needed
    if (shouldAwardXp && input.earnedXp > 0) {
      // Supabase Postgres function `increment_user_xp` would be ideal, but we can do a read-modify-write
      // However, we need to be careful with concurrency. In this MVP, we assume admin is the only one reviewing.
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', attempt.user_id)
        .single()
        
      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_xp: (profile.total_xp || 0) + input.earnedXp
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
