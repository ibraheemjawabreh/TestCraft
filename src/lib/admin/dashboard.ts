import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']

export interface AdminDashboardStats {
  pendingReviews: number
  pendingReports: number
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

export interface AdminDashboardData {
  stats: AdminDashboardStats
  recentBugReports: RecentBugReport[]
  recentUsers: RecentUser[]
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
    pendingAttemptsCount,
    pendingReportsCount,
    activeUsersCount,
    activeChallengesCount,
    publishedLessonsCount,
    recentReportsResult,
    recentUsersResult,
  ] = await Promise.all([
    supabase.from('challenge_attempts').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'reviewing']),
    supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }), // For this MVP, all profiles are considered 'active' users
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('is_published', true),
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
  ])

  if (
    pendingAttemptsCount.error ||
    pendingReportsCount.error ||
    activeUsersCount.error ||
    activeChallengesCount.error ||
    publishedLessonsCount.error ||
    recentReportsResult.error ||
    recentUsersResult.error
  ) {
    return { data: null, error: 'failedToLoad' }
  }

  const reportRows = recentReportsResult.data ?? []
  const userIds = uniqueStrings(reportRows.map((report) => report.user_id))
  const challengeIds = uniqueStrings(reportRows.map((report) => report.challenge_id))

  const [profilesResult, challengesResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    challengeIds.length > 0
      ? supabase.from('challenges').select('id, title').in('id', challengeIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const usernamesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.username])
  )
  const challengeTitlesById = new Map(
    (challengesResult.data ?? []).map((challenge) => [challenge.id, challenge.title])
  )

  return {
    data: {
      stats: {
        pendingReviews: countOrZero(pendingAttemptsCount.count),
        pendingReports: countOrZero(pendingReportsCount.count),
        activeUsers: countOrZero(activeUsersCount.count),
        activeChallenges: countOrZero(activeChallengesCount.count),
        publishedLessons: countOrZero(publishedLessonsCount.count),
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
    },
    error: null,
  }
}
