import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import type { AttemptStatus } from '@/types/database'
import { completeChallengeAndUnlockNext } from '@/lib/academy/services/ProgressService'
import { awardChallengeXp } from '@/lib/gamification/engine'

type BugReport = Database['public']['Tables']['bug_reports']['Row']
type ChallengeAttempt = Database['public']['Tables']['challenge_attempts']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Challenge = Database['public']['Tables']['challenges']['Row']
type HiddenBug = Database['public']['Tables']['hidden_bugs']['Row']

export interface HiddenBugItem {
  id: string
  bug_key: string | null
  bug_title: string
  actual_severity: Database['public']['Enums']['severity_level']
  bonus_xp: number | null
  is_active: boolean
}

export interface AttemptReviewData {
  attempt: ChallengeAttempt & { xp_awarded?: boolean; awarded_xp?: number }
  tester: Pick<Profile, 'username' | 'avatar_url' | 'current_level' | 'total_xp'>
  challenge: Pick<Challenge, 'id' | 'title' | 'scenario' | 'instructions' | 'base_xp_reward'>
  reports: BugReport[]
  hiddenBugs: HiddenBugItem[]
  awardedBugIds?: string[]
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
          id,
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
      .select('id, bug_key, bug_title, actual_severity, bonus_xp, is_active')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)

    if (bugsError) {
      return { data: null, error: 'Failed to fetch hidden bugs.' }
    }

    // Fetch awarded bugs from xp_transactions if this attempt was already reviewed
    let awardedBugIds: string[] = []
    if ((attempt as any).xp_awarded) {
      const { data: xpTx } = await supabase
        .from('xp_transactions')
        .select('metadata')
        .eq('source_id', attemptId)
        .eq('reason', 'bug_bonus')
      
      if (xpTx) {
        awardedBugIds = xpTx.map(tx => (tx.metadata as any)?.hiddenBugId).filter(Boolean) as string[]
      }
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
          xp_awarded: (attempt as any).xp_awarded ?? false,
          awarded_xp: (attempt as any).awarded_xp ?? 0,
          created_at: attempt.created_at,
          updated_at: attempt.updated_at,
        },
        tester: attempt.profiles as any,
        challenge: attempt.challenges as any,
        reports: reports || [],
        hiddenBugs: (hiddenBugs || []) as HiddenBugItem[],
        awardedBugIds,
      },
      error: null,
    }
  } catch (error) {
    console.error('getAdminAttemptReview unexpected error:', error)
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

export interface ReportClassificationUpdate {
  id: string
  status: 'Pending' | 'Reviewed' | 'Rejected'
  adminClassification?: 'valid_bug' | 'duplicate' | 'not_a_bug' | 'needs_improvement'
  matchedHiddenBugId?: string | null
}

export interface SaveReviewInput {
  attemptId: string
  challengeId: string
  status: Extract<AttemptStatus, 'approved' | 'rejected'>
  adminFeedback: string
  isPassed: boolean
  reportUpdates: ReportClassificationUpdate[]
  foundHiddenBugIds?: string[]
}

export async function saveAdminAttemptReview(input: SaveReviewInput): Promise<DataResult<boolean>> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { data: null, error: 'Unauthorized.' }
    }

    // Fetch attempt details
    // Using select('*') to include xp_awarded/awarded_xp columns added in migration 019
    // which are not yet reflected in the generated database.types.ts
    const { data: attempt, error: attemptError } = await supabase
      .from('challenge_attempts')
      .select('*')
      .eq('id', input.attemptId)
      .eq('challenge_id', input.challengeId)
      .single()

    if (attemptError || !attempt) {
      console.error('[saveAdminAttemptReview] Attempt fetch error:', attemptError)
      return { data: null, error: 'Attempt not found.' }
    }

    // Fetch challenge base_xp_reward
    const { data: challenge } = await supabase
      .from('challenges')
      .select('base_xp_reward')
      .eq('id', input.challengeId)
      .single()

    const baseXp = challenge?.base_xp_reward ?? 100

    const now = new Date().toISOString()

    // 1. Update individual bug report statuses and classifications
    if (input.reportUpdates.length > 0) {
      const reportUpdateResults = await Promise.all(
        input.reportUpdates.map((ru) => {
          let finalStatus = ru.status
          if (finalStatus === 'Pending') {
            finalStatus = ru.adminClassification === 'valid_bug'
              ? 'Reviewed'
              : input.status === 'approved' ? 'Reviewed' : 'Rejected'
          }

          const updatePayload: Record<string, any> = { status: finalStatus }

          if (ru.adminClassification) {
            updatePayload.admin_classification = ru.adminClassification
          }
          if (ru.matchedHiddenBugId !== undefined) {
            updatePayload.matched_hidden_bug_id = ru.matchedHiddenBugId
          }

          return supabase
            .from('bug_reports')
            .update(updatePayload)
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

    // 3. Award XP if approved and not previously awarded
    const alreadyAwarded = (attempt as any).xp_awarded === true
    if (input.status === 'approved' && !alreadyAwarded) {
      // Pass the found bug IDs directly, decoupling XP from report-to-bug 1:1 mapping
      const foundBugs = input.foundHiddenBugIds ?? input.reportUpdates.map((ru) => ru.matchedHiddenBugId).filter(Boolean) as string[]

      await awardChallengeXp(
        attempt.user_id,
        input.attemptId,
        input.challengeId,
        challenge?.base_xp_reward ?? 100,
        foundBugs
      )
    }

    // 4. If approved and passed: unlock next module (pass 0 since XP was handled above)
    if (input.status === 'approved' && input.isPassed && attempt.status !== 'approved') {
      await completeChallengeAndUnlockNext(attempt.user_id, input.challengeId, 0)
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
