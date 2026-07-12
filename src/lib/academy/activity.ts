import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type BugReport = Database['public']['Tables']['bug_reports']['Row']
type AiEvaluation = Database['public']['Tables']['ai_evaluations']['Row']
type UserBadge = Database['public']['Tables']['user_badges']['Row']
type ChallengeAttempt = Database['public']['Tables']['challenge_attempts']['Row']

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

interface JoinedChallenge {
  title: string | null
}

interface JoinedReport {
  title: string | null
}

interface JoinedBadge {
  name: string
  description: string
  icon_url: string | null
}

interface RecentReportRow extends Pick<
  BugReport,
  'id' | 'title' | 'reported_severity' | 'status' | 'created_at'
> {
  challenges: JoinedChallenge | JoinedChallenge[] | null
}

interface RecentAiFeedbackRow extends Pick<
  AiEvaluation,
  'id' | 'ai_score' | 'earned_xp' | 'quality_feedback' | 'evaluated_at'
> {
  bug_reports: JoinedReport | JoinedReport[] | null
}

interface UserBadgeRow extends Pick<UserBadge, 'badge_id' | 'earned_at'> {
  badges: JoinedBadge | JoinedBadge[] | null
}

interface ReviewedAttemptRow extends Pick<
  ChallengeAttempt,
  'id' | 'status' | 'final_score' | 'earned_xp' | 'admin_feedback' | 'reviewed_at'
> {
  challenges: JoinedChallenge | JoinedChallenge[] | null
}

export interface TesterActivityReport {
  id: string
  title: string
  challengeTitle: string | null
  reportedSeverity: BugReport['reported_severity']
  status: BugReport['status']
  createdAt: string | null
}

export interface TesterActivityAiFeedback {
  id: string
  aiScore: number
  earnedXp: number
  feedback: string
  evaluatedAt: string | null
  reportTitle: string | null
}

export interface TesterActivityBadge {
  badgeId: string
  name: string
  description: string
  iconUrl: string | null
  earnedAt: string | null
}

export interface TesterActivityAttempt {
  id: string
  challengeTitle: string | null
  status: string
  finalScore: number | null
  earnedXp: number | null
  adminFeedback: string | null
  reviewedAt: string | null
}

export interface TesterActivity {
  recentReports: TesterActivityReport[]
  recentAiFeedback: TesterActivityAiFeedback[]
  badges: TesterActivityBadge[]
  reviewedAttempts: TesterActivityAttempt[]
}

function firstJoined<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

export async function getTesterActivity(userId: string): Promise<Result<TesterActivity>> {
  try {
    const supabase = await createClient()

    const [reportsResult, aiFeedbackResult, badgesResult, attemptsResult] = await Promise.all([
      supabase
        .from('bug_reports')
        .select(`
          id,
          title,
          reported_severity,
          status,
          created_at,
          challenges ( title )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('ai_evaluations')
        .select(`
          id,
          ai_score,
          earned_xp,
          quality_feedback,
          evaluated_at,
          bug_reports!inner (
            user_id,
            title
          )
        `)
        .eq('bug_reports.user_id', userId)
        .order('evaluated_at', { ascending: false })
        .limit(8),
      supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          badges (
            name,
            description,
            icon_url
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
      supabase
        .from('challenge_attempts')
        .select(`
          id,
          status,
          final_score,
          earned_xp,
          admin_feedback,
          reviewed_at,
          challenges ( title )
        `)
        .eq('user_id', userId)
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(8),
    ])

    if (reportsResult.error || aiFeedbackResult.error || badgesResult.error || attemptsResult.error) {
      return { data: null, error: 'Failed to load activity.' }
    }

    const reportRows = (reportsResult.data ?? []) as unknown as RecentReportRow[]
    const feedbackRows = (aiFeedbackResult.data ?? []) as unknown as RecentAiFeedbackRow[]
    const badgeRows = (badgesResult.data ?? []) as unknown as UserBadgeRow[]
    const attemptRows = (attemptsResult.data ?? []) as unknown as ReviewedAttemptRow[]

    return {
      data: {
        recentReports: reportRows.map((report) => ({
          id: report.id,
          title: report.title,
          challengeTitle: firstJoined(report.challenges)?.title ?? null,
          reportedSeverity: report.reported_severity,
          status: report.status,
          createdAt: report.created_at,
        })),
        recentAiFeedback: feedbackRows.map((feedback) => ({
          id: feedback.id,
          aiScore: feedback.ai_score,
          earnedXp: feedback.earned_xp,
          feedback: feedback.quality_feedback,
          evaluatedAt: feedback.evaluated_at,
          reportTitle: firstJoined(feedback.bug_reports)?.title ?? null,
        })),
        badges: badgeRows.map((userBadge) => {
          const badge = firstJoined(userBadge.badges)

          return {
            badgeId: userBadge.badge_id,
            name: badge?.name ?? '',
            description: badge?.description ?? '',
            iconUrl: badge?.icon_url ?? null,
            earnedAt: userBadge.earned_at,
          }
        }),
        reviewedAttempts: attemptRows.map((attempt) => ({
          id: attempt.id,
          challengeTitle: firstJoined(attempt.challenges)?.title ?? null,
          status: attempt.status,
          finalScore: attempt.final_score,
          earnedXp: attempt.earned_xp,
          adminFeedback: attempt.admin_feedback,
          reviewedAt: attempt.reviewed_at,
        })),
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to load activity.' }
  }
}
