import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type AiEvaluation = Database['public']['Tables']['ai_evaluations']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export interface AdminDashboardStats {
  totalUsers: number
  totalAdmins: number
  totalTesters: number
  totalChallenges: number
  activeChallenges: number
  inactiveChallenges: number
  totalHiddenBugs: number
  totalBugReports: number
  pendingReports: number
  reviewedReports: number
  rejectedReports: number
  totalAiEvaluations: number
  totalXpAwarded: number
  averageAiScore: number
  totalBadges: number
  awardedBadges: number
}

export interface RecentBugReport {
  id: string
  title: string
  status: BugReport['status']
  severity: BugReport['reported_severity']
  createdAt: string | null
  username: string | null
  challengeTitle: string | null
}

export interface RecentUser {
  id: string
  username: string
  role: Profile['role']
  totalXp: number | null
  currentLevel: number | null
  createdAt: string | null
}

export interface RecentAiEvaluation {
  id: string
  aiScore: number
  earnedXp: number
  evaluatedAt: string | null
  reportTitle: string | null
}

export interface AdminDashboardData {
  stats: AdminDashboardStats
  recentBugReports: RecentBugReport[]
  recentUsers: RecentUser[]
  recentAiEvaluations: RecentAiEvaluation[]
}

export type AdminDashboardResult =
  | { data: AdminDashboardData; error: null }
  | { data: null; error: string }

function countOrZero(count: number | null): number {
  return count ?? 0
}

function uniqueStrings(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export async function getAdminDashboardStats(): Promise<AdminDashboardResult> {
  const supabase = await createClient()

  const [
    totalUsers,
    totalAdmins,
    totalTesters,
    totalChallenges,
    activeChallenges,
    inactiveChallenges,
    totalHiddenBugs,
    totalBugReports,
    pendingReports,
    reviewedReports,
    rejectedReports,
    totalAiEvaluations,
    totalBadges,
    awardedBadges,
    aiMetricRows,
    recentBugReportsResult,
    recentUsersResult,
    recentAiEvaluationsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tester'),
    supabase.from('challenges').select('*', { count: 'exact', head: true }),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', false),
    supabase.from('hidden_bugs').select('*', { count: 'exact', head: true }),
    supabase.from('bug_reports').select('*', { count: 'exact', head: true }),
    supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'Reviewed'),
    supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
    supabase.from('ai_evaluations').select('*', { count: 'exact', head: true }),
    supabase.from('badges').select('*', { count: 'exact', head: true }),
    supabase.from('user_badges').select('*', { count: 'exact', head: true }),
    supabase.from('ai_evaluations').select('earned_xp, ai_score'),
    supabase
      .from('bug_reports')
      .select('id, title, status, reported_severity, created_at, user_id, challenge_id')
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('id, username, role, total_xp, current_level, created_at')
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(5),
    supabase
      .from('ai_evaluations')
      .select('id, report_id, ai_score, earned_xp, evaluated_at')
      .order('evaluated_at', { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  const requiredResults = [
    totalUsers,
    totalAdmins,
    totalTesters,
    totalChallenges,
    activeChallenges,
    inactiveChallenges,
    totalHiddenBugs,
    totalBugReports,
    pendingReports,
    reviewedReports,
    rejectedReports,
    totalAiEvaluations,
    totalBadges,
    awardedBadges,
    aiMetricRows,
    recentBugReportsResult,
    recentUsersResult,
    recentAiEvaluationsResult,
  ]

  if (requiredResults.some((result) => result.error)) {
    return { data: null, error: 'failedToLoad' }
  }

  const aiRows = aiMetricRows.data ?? []
  const totalXpAwarded = aiRows.reduce((sum, row) => sum + row.earned_xp, 0)
  const averageAiScore =
    aiRows.length === 0
      ? 0
      : Number((aiRows.reduce((sum, row) => sum + row.ai_score, 0) / aiRows.length).toFixed(1))

  const reportRows = recentBugReportsResult.data ?? []
  const recentEvaluationRows = recentAiEvaluationsResult.data ?? []
  const userIds = uniqueStrings(reportRows.map((report) => report.user_id))
  const challengeIds = uniqueStrings(reportRows.map((report) => report.challenge_id))
  const reportIds = uniqueStrings(recentEvaluationRows.map((evaluation) => evaluation.report_id))

  const [profilesResult, challengesResult, reportsResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    challengeIds.length > 0
      ? supabase.from('challenges').select('id, title').in('id', challengeIds)
      : Promise.resolve({ data: [], error: null }),
    reportIds.length > 0
      ? supabase.from('bug_reports').select('id, title').in('id', reportIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const usernamesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.username]),
  )
  const challengeTitlesById = new Map(
    (challengesResult.data ?? []).map((challenge) => [challenge.id, challenge.title]),
  )
  const reportTitlesById = new Map(
    (reportsResult.data ?? []).map((report) => [report.id, report.title]),
  )

  return {
    data: {
      stats: {
        totalUsers: countOrZero(totalUsers.count),
        totalAdmins: countOrZero(totalAdmins.count),
        totalTesters: countOrZero(totalTesters.count),
        totalChallenges: countOrZero(totalChallenges.count),
        activeChallenges: countOrZero(activeChallenges.count),
        inactiveChallenges: countOrZero(inactiveChallenges.count),
        totalHiddenBugs: countOrZero(totalHiddenBugs.count),
        totalBugReports: countOrZero(totalBugReports.count),
        pendingReports: countOrZero(pendingReports.count),
        reviewedReports: countOrZero(reviewedReports.count),
        rejectedReports: countOrZero(rejectedReports.count),
        totalAiEvaluations: countOrZero(totalAiEvaluations.count),
        totalXpAwarded,
        averageAiScore,
        totalBadges: countOrZero(totalBadges.count),
        awardedBadges: countOrZero(awardedBadges.count),
      },
      recentBugReports: reportRows.map((report) => ({
        id: report.id,
        title: report.title,
        status: report.status,
        severity: report.reported_severity,
        createdAt: report.created_at,
        username: report.user_id ? usernamesById.get(report.user_id) ?? null : null,
        challengeTitle: report.challenge_id
          ? challengeTitlesById.get(report.challenge_id) ?? null
          : null,
      })),
      recentUsers: (recentUsersResult.data ?? []).map((profile) => ({
        id: profile.id,
        username: profile.username,
        role: profile.role,
        totalXp: profile.total_xp,
        currentLevel: profile.current_level,
        createdAt: profile.created_at,
      })),
      recentAiEvaluations: recentEvaluationRows.map(
        (
          evaluation: Pick<
            AiEvaluation,
            'id' | 'report_id' | 'ai_score' | 'earned_xp' | 'evaluated_at'
          >,
        ) => ({
          id: evaluation.id,
          aiScore: evaluation.ai_score,
          earnedXp: evaluation.earned_xp,
          evaluatedAt: evaluation.evaluated_at,
          reportTitle: evaluation.report_id
            ? reportTitlesById.get(evaluation.report_id) ?? null
            : null,
        }),
      ),
    },
    error: null,
  }
}
