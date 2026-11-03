import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { getLevelFromXp } from '@/lib/gamification/engine'

type Profile = Database['public']['Tables']['profiles']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']

export interface AdminDashboardStats {
  // Curriculum
  totalPaths: number
  totalModules: number
  totalLessons: number
  totalChallenges: number
  // Users
  totalStudents: number
  // Attempts
  pendingReviews: number
  approvedAttempts: number
  rejectedAttempts: number
  // Reports
  totalBugReports: number
  pendingReports: number
  // Legacy compat aliases
  activeUsers: number
  activeChallenges: number
  publishedLessons: number
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

export interface RecentSubmission {
  id: string
  testerUsername: string
  challengeTitle: string
  status: string
  submittedAt: string | null
}

export interface AdminDashboardData {
  stats: AdminDashboardStats
  recentBugReports: RecentBugReport[]
  recentUsers: RecentUser[]
  recentSubmissions: RecentSubmission[]
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

export async function getAdminDashboardOverview(): Promise<AdminDashboardResult> {
  const supabase = await createClient()

  const [
    totalPathsRes,
    totalModulesRes,
    totalLessonsRes,
    totalChallengesRes,
    totalStudentsRes,
    pendingAttemptsRes,
    approvedAttemptsRes,
    rejectedAttemptsRes,
    totalBugReportsRes,
    pendingReportsRes,
    recentReportsResult,
    recentUsersResult,
    recentSubmissionsResult,
  ] = await Promise.all([
    supabase.from('learning_paths').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('learning_modules').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tester'),
    supabase.from('challenge_attempts').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'reviewing']),
    supabase.from('challenge_attempts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('challenge_attempts').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('bug_reports').select('id', { count: 'exact', head: true }),
    supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
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
      .from('challenge_attempts')
      .select('id, challenge_id, status, submitted_at, user_id')
      .in('status', ['submitted', 'reviewing'])
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  if (
    totalPathsRes.error || totalModulesRes.error || totalLessonsRes.error ||
    totalChallengesRes.error || totalStudentsRes.error || pendingAttemptsRes.error ||
    approvedAttemptsRes.error || rejectedAttemptsRes.error || totalBugReportsRes.error ||
    pendingReportsRes.error || recentReportsResult.error || recentUsersResult.error
  ) {
    return { data: null, error: 'failedToLoad' }
  }

  const reportRows = recentReportsResult.data ?? []
  const submissionRows = (recentSubmissionsResult.data ?? []) as Array<{ id: string; challenge_id: string; status: string; submitted_at: string | null; user_id: string }>
  const userIds = uniqueStrings(reportRows.map((r) => r.user_id))
  const challengeIds = uniqueStrings(reportRows.map((r) => r.challenge_id))
  const submissionUserIds = uniqueStrings(submissionRows.map((s) => s.user_id))
  const submissionChallengeIds = uniqueStrings(submissionRows.map((s) => s.challenge_id))
  const allUserIds = uniqueStrings([...userIds, ...submissionUserIds])
  const allChallengeIds = uniqueStrings([...challengeIds, ...submissionChallengeIds])

  const [profilesResult, challengesResult] = await Promise.all([
    allUserIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', allUserIds)
      : Promise.resolve({ data: [], error: null }),
    allChallengeIds.length > 0
      ? supabase.from('challenges').select('id, title').in('id', allChallengeIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const usernamesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.username])
  )
  const challengeTitlesById = new Map(
    (challengesResult.data ?? []).map((challenge) => [challenge.id, challenge.title])
  )

  const totalStudents = countOrZero(totalStudentsRes.count)

  return {
    data: {
      stats: {
        totalPaths: countOrZero(totalPathsRes.count),
        totalModules: countOrZero(totalModulesRes.count),
        totalLessons: countOrZero(totalLessonsRes.count),
        totalChallenges: countOrZero(totalChallengesRes.count),
        totalStudents,
        pendingReviews: countOrZero(pendingAttemptsRes.count),
        approvedAttempts: countOrZero(approvedAttemptsRes.count),
        rejectedAttempts: countOrZero(rejectedAttemptsRes.count),
        totalBugReports: countOrZero(totalBugReportsRes.count),
        pendingReports: countOrZero(pendingReportsRes.count),
        activeUsers: totalStudents,
        activeChallenges: countOrZero(totalChallengesRes.count),
        publishedLessons: countOrZero(totalLessonsRes.count),
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
        currentLevel: getLevelFromXp(profile.total_xp ?? 0),
        createdAt: profile.created_at,
      })),
      recentSubmissions: submissionRows.map((s) => ({
        id: s.id,
        testerUsername: usernamesById.get(s.user_id) ?? 'Unknown',
        challengeTitle: challengeTitlesById.get(s.challenge_id) ?? 'Unknown Challenge',
        status: s.status,
        submittedAt: s.submitted_at,
      })),
    },
    error: null,
  }
}
