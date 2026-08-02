import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { getRankFromLevel, getLevelProgress, type RankInfo, type LevelProgress } from '@/lib/gamification/engine'

type Profile = Database['public']['Tables']['profiles']['Row']
type ReportStatus = Database['public']['Enums']['report_status']

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export interface AttemptSummary {
  id: string
  challengeId: string
  challengeTitle: string
  status: string
  submittedAt: string | null
  score: number | null
  earnedXp: number | null
  isPassed: boolean | null
}

export interface EarnedBadge {
  id: string
  badge_key: string
  name: string
  name_ar: string | null
  icon_url: string | null
  earned_at: string
}

export interface TesterProgressStats {
  profile: Profile
  totalXp: number
  currentLevel: number
  rank: RankInfo
  levelProgress: LevelProgress
  earnedBadges: EarnedBadge[]
  // Lesson & challenge counts
  completedLessonsCount: number
  completedChallengesCount: number
  // Attempts breakdown
  approvedAttempts: number
  pendingAttempts: number
  rejectedAttempts: number
  // Bug reports breakdown
  totalReports: number
  pendingReports: number
  reviewedReports: number
  rejectedReports: number
  // Legacy fields
  activeChallengesCount: number
  attemptedChallengesCount: number
  aiEvaluationsCount: number
  badgesCount: number
  // Detailed attempts
  recentAttempts: AttemptSummary[]
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
      completedLessonsResult,
      approvedAttemptsResult,
      pendingAttemptsResult,
      rejectedAttemptsResult,
      recentAttemptsResult,
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
      supabase
        .from('lesson_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null),
      supabase
        .from('challenge_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved'),
      supabase
        .from('challenge_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['submitted', 'reviewing']),
      supabase
        .from('challenge_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'rejected'),
      supabase
        .from('challenge_attempts')
        .select('id, challenge_id, status, submitted_at, score, earned_xp, is_passed')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(10),
    ])

    if (
      activeChallengesResult.error || reportsResult.error ||
      aiEvaluationsResult.error || badgesResult.error
    ) {
      return { data: null, error: 'Failed to load progress data.' }
    }

    const reports: ReportCountRow[] = reportsResult.data ?? []
    const attemptedChallengeIds = new Set(
      reports
        .map((report) => report.challenge_id)
        .filter((challengeId): challengeId is string => Boolean(challengeId)),
    )

    // Fetch challenge titles for recent attempts
    const recentAttemptRows = (recentAttemptsResult.data ?? []) as Array<{
      id: string; challenge_id: string; status: string
      submitted_at: string | null; score: number | null
      earned_xp: number | null; is_passed: boolean | null
    }>
    const challengeIds = [...new Set(recentAttemptRows.map((a) => a.challenge_id).filter(Boolean))]
    const { data: challengeRows } = challengeIds.length > 0
      ? await supabase.from('challenges').select('id, title').in('id', challengeIds)
      : { data: [] }
    const titleById = new Map((challengeRows ?? []).map((c) => [c.id, c.title]))

    // Fetch full badge details
    const { data: earnedBadgesData } = await supabase
      .from('user_badges')
      .select(`
        earned_at,
        badges!inner (
          id, badge_key, name, name_ar, icon_url
        )
      `)
      .eq('user_id', userId)

    const earnedBadges: EarnedBadge[] = (earnedBadgesData ?? []).map((ub) => ({
      id: (ub.badges as any).id,
      badge_key: (ub.badges as any).badge_key,
      name: (ub.badges as any).name,
      name_ar: (ub.badges as any).name_ar,
      icon_url: (ub.badges as any).icon_url,
      earned_at: ub.earned_at ?? new Date().toISOString(),
    }))

    const totalXp = profile.total_xp ?? 0
    const levelProgress = getLevelProgress(totalXp)
    const currentLevel = levelProgress.currentLevel
    const rank = getRankFromLevel(currentLevel)

    return {
      data: {
        profile,
        totalXp,
        currentLevel,
        rank,
        levelProgress,
        earnedBadges,
        completedLessonsCount: completedLessonsResult.count ?? 0,
        completedChallengesCount: approvedAttemptsResult.count ?? 0,
        approvedAttempts: approvedAttemptsResult.count ?? 0,
        pendingAttempts: pendingAttemptsResult.count ?? 0,
        rejectedAttempts: rejectedAttemptsResult.count ?? 0,
        activeChallengesCount: activeChallengesResult.count ?? 0,
        attemptedChallengesCount: attemptedChallengeIds.size,
        totalReports: reports.length,
        pendingReports: countStatus(reports, 'Pending'),
        reviewedReports: countStatus(reports, 'Reviewed'),
        rejectedReports: countStatus(reports, 'Rejected'),
        aiEvaluationsCount: aiEvaluationsResult.count ?? 0,
        badgesCount: badgesResult.count ?? 0,
        recentAttempts: recentAttemptRows.map((a) => ({
          id: a.id,
          challengeId: a.challenge_id,
          challengeTitle: titleById.get(a.challenge_id) ?? 'Unknown Challenge',
          status: a.status,
          submittedAt: a.submitted_at,
          score: a.score,
          earnedXp: a.earned_xp,
          isPassed: a.is_passed,
        })),
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to load progress data.' }
  }
}
