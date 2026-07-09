import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'
import { getActiveChallengesForTester, type ChallengeWithStatus } from './challenges'
import { getTesterAiEvaluations, type EvaluationWithReport } from './evaluations'
import { getTesterBadges, type UserBadgeWithDetails } from './badges'

type Profile = Database['public']['Tables']['profiles']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']

export interface ReportWithChallengeTitle extends BugReport {
  challenge_title: string | null
}

export interface AcademyDashboardData {
  profile: Profile
  stats: {
    activeChallengesCount: number
    attemptedChallengesCount: number
    totalReports: number
    pendingReports: number
    reviewedReports: number
    rejectedReports: number
    aiEvaluationsCount: number
    badgesCount: number
  }
  recommendedChallenges: ChallengeWithStatus[]
  recentReports: ReportWithChallengeTitle[]
  recentEvaluations: EvaluationWithReport[]
  badges: UserBadgeWithDetails[]
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Aggregates all data needed for the Academy dashboard in efficient parallel queries.
 * Does not fetch answer-key tables.
 */
export async function getAcademyDashboardData(
  userId: string,
  profile: Profile,
  locale: Locale,
): Promise<Result<AcademyDashboardData>> {
  try {
    const supabase = await createClient()

    // Run all independent queries in parallel
    const [
      activeChallengesResult,
      reportCountsResult,
      recentReportsResult,
      evaluationsResult,
      badgesResult,
    ] = await Promise.all([
      // Active challenges with user status
      getActiveChallengesForTester(userId, locale),

      // Report counts by status
      supabase
        .from('bug_reports')
        .select('status, challenge_id')
        .eq('user_id', userId),

      // Recent 5 reports with challenge title
      supabase
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
        .limit(5),

      // AI evaluations (latest 5)
      getTesterAiEvaluations(userId),

      // Badges
      getTesterBadges(userId),
    ])

    const allReports = reportCountsResult.data ?? []
    const reportStatuses = allReports.map((r) => r.status)
    const uniqueChallengeIds = new Set(
      allReports.map((r) => r.challenge_id).filter(Boolean),
    )

    const stats = {
      activeChallengesCount: activeChallengesResult.data?.length ?? 0,
      attemptedChallengesCount: uniqueChallengeIds.size,
      totalReports: allReports.length,
      pendingReports: reportStatuses.filter((s) => s === 'Pending').length,
      reviewedReports: reportStatuses.filter((s) => s === 'Reviewed').length,
      rejectedReports: reportStatuses.filter((s) => s === 'Rejected').length,
      aiEvaluationsCount: evaluationsResult.data?.length ?? 0,
      badgesCount: badgesResult.data?.length ?? 0,
    }

    // Build recommended challenges: not_started first, then others
    const allChallenges = activeChallengesResult.data ?? []
    const notStarted = allChallenges.filter((c) => c.userStatus === 'not_started')
    const inProgress = allChallenges.filter((c) => c.userStatus !== 'not_started')
    const recommendedChallenges = [...notStarted, ...inProgress].slice(0, 6)

    // Map recent reports
    const rawReports = recentReportsResult.data ?? []
    const recentReports: ReportWithChallengeTitle[] = rawReports.map((row) => ({
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

    const recentEvaluations = (evaluationsResult.data ?? []).slice(0, 5)

    return {
      data: {
        profile,
        stats,
        recommendedChallenges,
        recentReports,
        recentEvaluations,
        badges: badgesResult.data ?? [],
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to load academy data.' }
  }
}
