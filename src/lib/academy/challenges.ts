import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Challenge = Database['public']['Tables']['challenges']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']

export type ChallengeStatus =
  | 'not_started'
  | 'pending_review'
  | 'reviewed'
  | 'needs_improvement'

export interface ChallengeWithStatus extends Challenge {
  userStatus: ChallengeStatus
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Derives user challenge status from their bug reports for that challenge.
 * Does NOT touch hidden_bugs.
 */
function deriveStatus(
  reports: Pick<BugReport, 'status'>[],
): ChallengeStatus {
  if (!reports || reports.length === 0) return 'not_started'

  const statuses = reports.map((r) => r.status)

  if (statuses.some((s) => s === 'Reviewed')) return 'reviewed'
  if (statuses.some((s) => s === 'Pending')) return 'pending_review'
  if (statuses.every((s) => s === 'Rejected')) return 'needs_improvement'

  return 'pending_review'
}

/**
 * Fetches all active challenges and computes per-challenge status for the tester.
 * Never touches hidden_bugs table.
 */
export async function getActiveChallengesForTester(
  userId: string,
): Promise<Result<ChallengeWithStatus[]>> {
  try {
    const supabase = await createClient()

    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id, title, description, difficulty, base_xp_reward, is_active')
      .eq('is_active', true)
      .order('base_xp_reward', { ascending: false })

    if (challengesError) {
      return { data: null, error: 'Failed to load challenges.' }
    }

    if (!challenges || challenges.length === 0) {
      return { data: [], error: null }
    }

    // Fetch user's reports for these challenges
    const challengeIds = challenges.map((c) => c.id)

    const { data: reports, error: reportsError } = await supabase
      .from('bug_reports')
      .select('challenge_id, status')
      .eq('user_id', userId)
      .in('challenge_id', challengeIds)

    if (reportsError) {
      // If reports fail, still show challenges with 'not_started' status
      const withStatus = challenges.map((c) => ({
        ...c,
        userStatus: 'not_started' as ChallengeStatus,
      }))
      return { data: withStatus, error: null }
    }

    // Group reports by challenge_id
    const reportsByChallenge = new Map<string, Pick<BugReport, 'status'>[]>()
    for (const report of reports ?? []) {
      if (!report.challenge_id) continue
      const existing = reportsByChallenge.get(report.challenge_id) ?? []
      existing.push({ status: report.status })
      reportsByChallenge.set(report.challenge_id, existing)
    }

    const withStatus: ChallengeWithStatus[] = challenges.map((c) => ({
      ...c,
      userStatus: deriveStatus(reportsByChallenge.get(c.id) ?? []),
    }))

    return { data: withStatus, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Fetches a single active challenge for the tester.
 * Returns null if challenge doesn't exist or is inactive.
 * Never touches hidden_bugs.
 */
export async function getChallengeForTester(
  challengeId: string,
  userId: string,
): Promise<Result<{ challenge: Challenge; userStatus: ChallengeStatus }>> {
  try {
    const supabase = await createClient()

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, description, difficulty, base_xp_reward, is_active')
      .eq('id', challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return { data: null, error: 'challenge_not_found' }
    }

    const { data: reports } = await supabase
      .from('bug_reports')
      .select('status')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)

    const userStatus = deriveStatus(reports ?? [])

    return { data: { challenge, userStatus }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
