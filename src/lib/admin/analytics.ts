import 'server-only'

import { createClient } from '@/lib/supabase/server'

export interface AdminAnalyticsData {
  users: {
    total: number
    testers: number
    admins: number
  }
  learning: {
    learningPaths: number
    publishedLessons: number
    completedLessons: number
    lessonProgress: number
  }
  challenges: {
    active: number
    inactive: number
    attempted: number
    totalAttempts: number
  }
  reports: {
    total: number
    pending: number
    reviewed: number
    rejected: number
  }
  ai: {
    totalEvaluations: number
    averageScore: number
    totalXp: number
  }
  badges: {
    defined: number
    awarded: number
  }
}

type AnalyticsResult =
  | { data: AdminAnalyticsData; error: null }
  | { data: null; error: string }

function countOrZero(count: number | null): number {
  return count ?? 0
}

export async function getAdminAnalytics(): Promise<AnalyticsResult> {
  try {
    const supabase = await createClient()

    const [
      totalUsers,
      totalTesters,
      totalAdmins,
      learningPaths,
      publishedLessons,
      completedLessons,
      lessonProgress,
      activeChallenges,
      inactiveChallenges,
      attemptedChallenges,
      totalAttempts,
      totalReports,
      pendingReports,
      reviewedReports,
      rejectedReports,
      totalAiEvaluations,
      aiMetrics,
      badgesDefined,
      badgesAwarded,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tester'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('learning_paths').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('lesson_progress').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('lesson_progress').select('*', { count: 'exact', head: true }),
      supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('challenge_attempts').select('user_id', { count: 'exact', head: false }),
      supabase.from('challenge_attempts').select('*', { count: 'exact', head: true }),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'Reviewed'),
      supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('ai_evaluations').select('id', { count: 'exact', head: true }),
      supabase.from('ai_evaluations').select('ai_score, earned_xp'),
      supabase.from('badges').select('*', { count: 'exact', head: true }),
      supabase.from('user_badges').select('*', { count: 'exact', head: true }),
    ])

    const aiRows = aiMetrics.data ?? []
    const totalXpFromAi = aiRows.reduce((sum, row) => sum + row.earned_xp, 0)
    const averageAiScore =
      aiRows.length === 0
        ? 0
        : Number((aiRows.reduce((sum, row) => sum + row.ai_score, 0) / aiRows.length).toFixed(1))

    // Count unique users who attempted challenges
    const uniqueAttemptedUsers = new Set(
      (attemptedChallenges.data ?? []).map((row) => row.user_id)
    ).size

    return {
      data: {
        users: {
          total: countOrZero(totalUsers.count),
          testers: countOrZero(totalTesters.count),
          admins: countOrZero(totalAdmins.count),
        },
        learning: {
          learningPaths: countOrZero(learningPaths.count),
          publishedLessons: countOrZero(publishedLessons.count),
          completedLessons: countOrZero(completedLessons.count),
          lessonProgress: countOrZero(lessonProgress.count),
        },
        challenges: {
          active: countOrZero(activeChallenges.count),
          inactive: countOrZero(inactiveChallenges.count),
          attempted: uniqueAttemptedUsers,
          totalAttempts: countOrZero(totalAttempts.count),
        },
        reports: {
          total: countOrZero(totalReports.count),
          pending: countOrZero(pendingReports.count),
          reviewed: countOrZero(reviewedReports.count),
          rejected: countOrZero(rejectedReports.count),
        },
        ai: {
          totalEvaluations: countOrZero(totalAiEvaluations.count),
          averageScore: averageAiScore,
          totalXp: totalXpFromAi,
        },
        badges: {
          defined: countOrZero(badgesDefined.count),
          awarded: countOrZero(badgesAwarded.count),
        },
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'Failed to load analytics data.' }
  }
}
