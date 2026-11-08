import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { TesterAuthContext } from '@/lib/auth/require-tester'
import { getRankFromLevel, getLevelProgress, type RankInfo, type LevelProgress } from '@/lib/gamification/engine'

type Profile = TesterAuthContext['profile']
type Result<T> = { data: T; error: null } | { data: null; error: string }

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
  completedLessonsCount: number
  completedChallengesCount: number
  approvedAttempts: number
  pendingAttempts: number
  rejectedAttempts: number
  totalReports: number
  pendingReports: number
  reviewedReports: number
  rejectedReports: number
  recentAttempts: AttemptSummary[]
}

export async function getTesterProgress(userId: string, profile: Profile): Promise<Result<TesterProgressStats>> {
  try {
    const db = await createClient()
    const attempts = () => db.from('challenge_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    const [reports, lessons, approved, pending, rejected, recent, badges] = await Promise.all([
      db.from('bug_reports').select('status').eq('user_id', userId),
      db.from('lesson_progress').select('lesson_id', { count: 'exact', head: true })
        .eq('user_id', userId).not('completed_at', 'is', null),
      attempts().eq('status', 'approved'),
      attempts().in('status', ['submitted', 'reviewing']),
      attempts().eq('status', 'rejected'),
      db.from('challenge_attempts')
        .select('id,challenge_id,status,submitted_at,score,earned_xp,is_passed,challenges(title)')
        .eq('user_id', userId).order('submitted_at', { ascending: false, nullsFirst: false }).limit(10),
      db.from('user_badges').select('earned_at,badges!inner(id,badge_key,name,name_ar,icon_url)').eq('user_id', userId),
    ])
    if ([reports, lessons, approved, pending, rejected, recent, badges].some(result => result.error)) {
      return { data: null, error: 'Failed to load progress data.' }
    }

    const counts = { Pending: 0, Reviewed: 0, Rejected: 0 }
    for (const { status } of reports.data ?? []) {
      if (status === 'Pending' || status === 'Reviewed' || status === 'Rejected') counts[status as keyof typeof counts]++
    }
    const totalXp = profile.total_xp ?? 0
    const levelProgress = getLevelProgress(totalXp)
    const currentLevel = levelProgress.currentLevel

    return {
      data: {
        profile, totalXp, currentLevel, levelProgress,
        rank: getRankFromLevel(currentLevel),
        earnedBadges: (badges.data ?? []).flatMap(ub => {
          const badge = Array.isArray(ub.badges) ? ub.badges[0] : ub.badges
          return badge ? [{ ...badge, earned_at: ub.earned_at ?? new Date().toISOString() }] : []
        }),
        completedLessonsCount: lessons.count ?? 0,
        completedChallengesCount: approved.count ?? 0,
        approvedAttempts: approved.count ?? 0,
        pendingAttempts: pending.count ?? 0,
        rejectedAttempts: rejected.count ?? 0,
        totalReports: reports.data?.length ?? 0,
        pendingReports: counts.Pending,
        reviewedReports: counts.Reviewed,
        rejectedReports: counts.Rejected,
        recentAttempts: (recent.data ?? []).map(a => ({
          id: a.id,
          challengeId: a.challenge_id,
          challengeTitle: (a.challenges as { title?: string } | null)?.title ?? 'Unknown Challenge',
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
