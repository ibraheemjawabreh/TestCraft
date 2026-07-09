import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type ReportStatus = Database['public']['Enums']['report_status']

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export interface TesterProgressStats {
  profile: Profile
  totalXp: number
  currentLevel: number
  activeChallengesCount: number
  attemptedChallengesCount: number
  totalReports: number
  pendingReports: number
  reviewedReports: number
  rejectedReports: number
  aiEvaluationsCount: number
  badgesCount: number
}

interface ReportCountRow {
  challenge_id: string | null
  status: ReportStatus | null
}

function countStatus(rows: ReportCountRow[], status: ReportStatus): number {
  return rows.filter((row) => row.status === status).length
}

export async function getTesterProgress(
  userId: string,
  profile: Profile,
): Promise<Result<TesterProgressStats>> {
  try {
    const supabase = await createClient()

    const [
      activeChallengesResult,
      reportsResult,
      aiEvaluationsResult,
      badgesResult,
    ] = await Promise.all([
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('bug_reports')
        .select('challenge_id, status')
        .eq('user_id', userId),
      supabase
        .from('ai_evaluations')
        .select('id, bug_reports!inner(user_id)', { count: 'exact', head: true })
        .eq('bug_reports.user_id', userId),
      supabase
        .from('user_badges')
        .select('badge_id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ])

    if (activeChallengesResult.error || reportsResult.error || aiEvaluationsResult.error || badgesResult.error) {
      return { data: null, error: 'Failed to load progress data.' }
    }

    const reports: ReportCountRow[] = reportsResult.data ?? []
    const attemptedChallengeIds = new Set(
      reports
        .map((report) => report.challenge_id)
        .filter((challengeId): challengeId is string => Boolean(challengeId)),
    )

    return {
      data: {
        profile,
        totalXp: profile.total_xp ?? 0,
        currentLevel: profile.current_level ?? 1,
        activeChallengesCount: activeChallengesResult.count ?? 0,
        attemptedChallengesCount: attemptedChallengeIds.size,
        totalReports: reports.length,
        pendingReports: countStatus(reports, 'Pending'),
        reviewedReports: countStatus(reports, 'Reviewed'),
        rejectedReports: countStatus(reports, 'Rejected'),
        aiEvaluationsCount: aiEvaluationsResult.count ?? 0,
        badgesCount: badgesResult.count ?? 0,
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to load progress data.' }
  }
}
