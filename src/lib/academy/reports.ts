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
        title,
        steps_to_reproduce,
        expected_result,
        actual_result,
        reported_severity,
        status,
        created_at,
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
      title: row.title,
      steps_to_reproduce: row.steps_to_reproduce,
      expected_result: row.expected_result,
      actual_result: row.actual_result,
      reported_severity: row.reported_severity,
      status: row.status,
      created_at: row.created_at,
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
 * Fetches the tester's bug reports for a specific challenge.
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
  title: string
  steps_to_reproduce: string
  expected_result: string
  actual_result: string
  reported_severity: Database['public']['Enums']['severity_level']
}

/**
 * Submits a bug report on behalf of the authenticated tester.
 * Server-side only. user_id is always set from the validated userId param —
 * never from client input.
 */
export async function submitBugReport(
  input: SubmitBugReportInput,
): Promise<Result<{ id: string }>> {
  try {
    // Validate with Zod (strips extra fields)
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

    // Verify challenge is active before inserting
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, is_active')
      .eq('id', input.challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return { data: null, error: 'challenge_not_found' }
    }

    const { data: report, error: insertError } = await supabase
      .from('bug_reports')
      .insert({
        user_id: input.userId,
        challenge_id: input.challengeId,
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
      return { data: null, error: 'Failed to submit report. Please try again.' }
    }

    return { data: { id: report.id }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
