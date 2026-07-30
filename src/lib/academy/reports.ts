import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { bugReportSchema } from '@/lib/validations/bug-report'

type BugReport = Database['public']['Tables']['bug_reports']['Row']

export interface ReportWithChallenge extends BugReport {
  challenge_title: string | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Fetches all bug reports for the current tester, joined with challenge title.
 */
export async function getTesterReports(
  userId: string,
): Promise<Result<ReportWithChallenge[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bug_reports')
      .select(`
        id,
        user_id,
        challenge_id,
        lab_template_id,
        attempt_id,
        title,
        steps_to_reproduce,
        expected_result,
        actual_result,
        reported_severity,
        status,
        created_at,
        admin_feedback,
        admin_score,
        reviewed_at,
        reviewed_by,
        challenges ( title )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: 'Failed to load reports.' }
    }

    const reports: ReportWithChallenge[] = (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      challenge_id: row.challenge_id,
      lab_template_id: row.lab_template_id,
      attempt_id: row.attempt_id,
      title: row.title,
      steps_to_reproduce: row.steps_to_reproduce,
      expected_result: row.expected_result,
      actual_result: row.actual_result,
      reported_severity: row.reported_severity,
      status: row.status,
      created_at: row.created_at,
      admin_feedback: row.admin_feedback,
      admin_score: row.admin_score,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      challenge_title: Array.isArray(row.challenges)
        ? (row.challenges[0]?.title ?? null)
        : ((row.challenges as { title: string } | null)?.title ?? null),
    }))

    return { data: reports, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Fetches the tester's bug reports for a specific attempt.
 */
export async function getTesterReportsForAttempt(
  attemptId: string,
): Promise<Result<BugReport[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: 'Failed to load reports.' }
    }

    return { data: data ?? [], error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Fetches the tester's bug reports for a specific challenge (all attempts combined).
 */
export async function getTesterReportsForChallenge(
  userId: string,
  challengeId: string,
): Promise<Result<BugReport[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: 'Failed to load reports.' }
    }

    return { data: data ?? [], error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

export interface SubmitBugReportInput {
  userId: string
  challengeId: string
  labTemplateId: string | null
  title: string
  steps_to_reproduce: string
  expected_result: string
  actual_result: string
  reported_severity: Database['public']['Enums']['severity_level']
}

/**
 * Submits a bug report belonging to the tester's current active attempt.
 *
 * Flow:
 * 1. Validate form data via Zod.
 * 2. Verify the challenge is active.
 * 3. Find the active attempt (started | submitted).
 *    - If none exists, create one with status "started".
 *    - If status is "started", keep it (report is mid-attempt).
 *    - If status is "submitted", allow adding more reports (admin hasn't started review).
 *    - Reject if attempt is "reviewing", "approved", or "rejected".
 * 4. Insert the bug_report with attempt_id.
 * 5. Keep challenge_progress in sync (non-blocking).
 */
export async function submitBugReport(
  input: SubmitBugReportInput,
): Promise<Result<{ id: string }>> {
  try {
    const parsed = bugReportSchema.safeParse({
      title: input.title,
      steps_to_reproduce: input.steps_to_reproduce,
      expected_result: input.expected_result,
      actual_result: input.actual_result,
      reported_severity: input.reported_severity,
    })

    if (!parsed.success) {
      return { data: null, error: 'Invalid form data. Please check your inputs.' }
    }

    const supabase = await createClient()

    // Safely resolve challengeId to actual UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.challengeId)
    const isNumeric = /^\d+$/.test(input.challengeId)

    let query = supabase
      .from('challenges')
      .select('id, is_active')

    if (isUuid) {
      query = query.eq('id', input.challengeId)
    } else if (isNumeric) {
      query = query.or(`sort_order.eq.${input.challengeId},slug.eq.${input.challengeId}`)
    } else {
      query = query.eq('slug', input.challengeId)
    }

    const { data: challenge, error: challengeError } = await query.maybeSingle()

    if (challengeError || !challenge) {
      return { data: null, error: 'Challenge not found.' }
    }

    const challengeId = challenge.id

    // Find the current active (mutable) attempt
    const { data: activeAttempt } = await supabase
      .from('challenge_attempts')
      .select('id, status')
      .eq('user_id', input.userId)
      .eq('challenge_id', challengeId)
      .in('status', ['started', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let attemptId: string

    if (!activeAttempt) {
      // Check if a terminal or reviewing attempt exists
      const { data: existingAttempt } = await supabase
        .from('challenge_attempts')
        .select('id, status')
        .eq('user_id', input.userId)
        .eq('challenge_id', challengeId)
        .in('status', ['reviewing', 'approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingAttempt) {
        if (existingAttempt.status === 'reviewing') {
          return { data: null, error: 'Your submission is currently under review and cannot be modified.' }
        }
        // approved or rejected — create a fresh attempt for new reports
      }

      const { data: newAttempt, error: insertErr } = await supabase
        .from('challenge_attempts')
        .insert({
          user_id: input.userId,
          challenge_id: challengeId,
          status: 'started',
        })
        .select('id')
        .single()

      if (insertErr || !newAttempt) {
        const isConflict = insertErr?.message?.includes('active attempt already exists')
        return {
          data: null,
          error: isConflict
            ? 'An active attempt already exists.'
            : 'Failed to create a challenge attempt.',
        }
      }

      attemptId = newAttempt.id
    } else {
      attemptId = activeAttempt.id
    }

    const { data: report, error: insertError } = await supabase
      .from('bug_reports')
      .insert({
        user_id: input.userId,
        challenge_id: challengeId,
        lab_template_id: input.labTemplateId,
        attempt_id: attemptId,
        title: parsed.data.title,
        steps_to_reproduce: parsed.data.steps_to_reproduce,
        expected_result: parsed.data.expected_result,
        actual_result: parsed.data.actual_result,
        reported_severity: parsed.data.reported_severity,
        status: 'Pending',
      })
      .select('id')
      .single()

    if (insertError || !report) {
      console.error('Bug report insert error:', insertError)
      return { data: null, error: 'Failed to submit report. Please try again.' }
    }

    // Sync challenge_progress (non-blocking)
    void syncChallengeProgress(supabase, input.userId, challengeId)

    return { data: { id: report.id }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Submits the current active attempt, transitioning it from "started" → "submitted".
 * This marks the challenge as formally submitted for admin review.
 */
export async function submitAttempt(
  userId: string,
  rawChallengeId: string,
  attemptId: string,
  timeSpentSeconds?: number,
): Promise<Result<{ success: boolean }>> {
  try {
    const supabase = await createClient()

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawChallengeId)
    let challengeId = rawChallengeId

    if (!isUuid) {
      const isNumeric = /^\d+$/.test(rawChallengeId)
      let query = supabase.from('challenges').select('id')
      if (isNumeric) {
        query = query.or(`sort_order.eq.${rawChallengeId},slug.eq.${rawChallengeId}`)
      } else {
        query = query.eq('slug', rawChallengeId)
      }
      const { data: c } = await query.maybeSingle()
      if (c?.id) challengeId = c.id
    }

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('challenge_attempts')
      .update({
        status: 'submitted',
        submitted_at: now,
        ...(timeSpentSeconds !== undefined ? { time_spent_seconds: timeSpentSeconds } : {}),
      })
      .eq('id', attemptId)
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .eq('status', 'started') // Only transition from started → submitted

    if (error) {
      return { data: null, error: 'Failed to submit attempt.' }
    }

    // Sync challenge_progress (non-blocking)
    const client = supabase
    void syncChallengeProgress(client, userId, challengeId, 'submitted', now)

    return { data: { success: true }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

async function syncChallengeProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  challengeId: string,
  status?: string,
  submittedAt?: string,
): Promise<void> {
  try {
    const now = new Date().toISOString()
    const { data: existingProgress } = await supabase
      .from('challenge_progress')
      .select('status')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .maybeSingle()

    if (existingProgress) {
      await supabase
        .from('challenge_progress')
        .update({
          status: status ?? 'submitted',
          submitted_at: submittedAt ?? now,
        })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
    } else {
      await supabase.from('challenge_progress').insert({
        user_id: userId,
        challenge_id: challengeId,
        status: status ?? 'submitted',
        started_at: now,
        submitted_at: submittedAt ?? now,
      })
    }
  } catch {
    // Non-blocking — report was already saved successfully
  }
}
