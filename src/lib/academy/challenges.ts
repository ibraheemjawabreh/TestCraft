import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'
import { localizedString } from '@/lib/i18n/content'
import { getAcademyLearningOverview } from '@/lib/academy/learning'

type Challenge = Database['public']['Tables']['challenges']['Row']
type BugReport = Database['public']['Tables']['bug_reports']['Row']
type Difficulty = Challenge['difficulty']

export type ChallengeStatus =
  | 'not_started'
  | 'pending_review'
  | 'reviewed'
  | 'needs_improvement'

export interface TesterChallenge {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  base_xp_reward: number
  is_active: boolean | null
  lesson_id: string | null
  challenge_type: string
  lab_template: string | null
  scenario: string | null
  instructions: string | null
  sort_order: number
}

export interface ChallengeWithStatus extends TesterChallenge {
  userStatus: ChallengeStatus
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Derives user challenge status from their bug reports for that challenge.
 * Derives status only from the tester's submitted reports.
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
 * Uses only active public challenge fields and tester report status.
 */
export async function getActiveChallengesForTester(
  userId: string,
  locale: Locale,
): Promise<Result<ChallengeWithStatus[]>> {
  try {
    const overview = await getAcademyLearningOverview(userId, locale)
    return { data: overview.data?.practiceChallenges ?? [], error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Fetches a single active challenge for the tester.
 * Returns null if challenge doesn't exist or is inactive.
 * Uses only active public challenge fields and tester report status.
 */
export async function getChallengeForTester(
  challengeId: string,
  userId: string,
  locale: Locale,
): Promise<Result<{ challenge: TesterChallenge; userStatus: ChallengeStatus }>> {
  try {
    const supabase = await createClient()

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select(`
        id,
        title,
        title_en,
        title_ar,
        description,
        description_en,
        description_ar,
        difficulty,
        base_xp_reward,
        is_active,
        lesson_id,
        challenge_type,
        lab_template,
        scenario,
        scenario_en,
        scenario_ar,
        instructions,
        instructions_en,
        instructions_ar,
        sort_order
      `)
      .eq('id', challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return { data: null, error: 'challenge_not_found' }
    }

    const overview = await getAcademyLearningOverview(userId, locale)
    const challengeRow = challenge as Record<string, unknown>
    const lessonId = typeof challengeRow.lesson_id === 'string' ? challengeRow.lesson_id : null

    if (lessonId) {
      const linkedLesson = overview.data?.lessons.find((lesson) => lesson.id === lessonId)
      if (!linkedLesson?.is_unlocked) {
        return { data: null, error: 'challenge_not_found' }
      }
    }

    const { data: reports } = await supabase
      .from('bug_reports')
      .select('status')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)

    const userStatus = deriveStatus(reports ?? [])
    const localizedChallenge: TesterChallenge = {
      id: challenge.id,
      title: localizedString(challengeRow, locale, 'title', 'title'),
      description: localizedString(challengeRow, locale, 'description', 'description'),
      difficulty: challenge.difficulty,
      base_xp_reward: challenge.base_xp_reward,
      is_active: challenge.is_active,
      lesson_id: challenge.lesson_id,
      challenge_type: challenge.challenge_type,
      lab_template: challenge.lab_template,
      scenario: localizedString(challengeRow, locale, 'scenario', 'scenario') || null,
      instructions: localizedString(challengeRow, locale, 'instructions', 'instructions') || null,
      sort_order: challenge.sort_order,
    }

    return { data: { challenge: localizedChallenge, userStatus }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
