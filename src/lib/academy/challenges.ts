import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type AttemptStatus } from '@/types/database'
import { type Locale } from '@/i18n/config'
import { localizedString } from '@/lib/i18n/content'
import { getAcademyLearningOverview } from '@/lib/academy/learning'

type Challenge = Database['public']['Tables']['challenges']['Row']
type Difficulty = Challenge['difficulty']

export type ChallengeStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'reviewing'
  | 'approved'
  | 'rejected'

export interface TesterChallenge {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  base_xp_reward: number
  is_active: boolean | null
  lesson_id: string | null
  challenge_type: string
  workflow_type: string
  practical_app_key: string | null
  lab_template: string | null
  lab_template_id: string | null
  scenario: string | null
  instructions: string | null
  sort_order: number
}

export interface ChallengeWithStatus extends TesterChallenge {
  userStatus: ChallengeStatus
  activeAttemptId: string | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Maps the attempt status from the database to the UI challenge status.
 */
export function deriveStatus(attemptStatus: AttemptStatus | string | null): ChallengeStatus {
  if (!attemptStatus || attemptStatus === 'started') return 'in_progress'
  if (attemptStatus === 'submitted') return 'pending_review'
  if (attemptStatus === 'reviewing') return 'reviewing'
  if (attemptStatus === 'approved') return 'approved'
  if (attemptStatus === 'rejected') return 'rejected'
  return 'not_started'
}

/**
 * Fetches all active challenges and computes per-challenge status for the tester.
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
 * Automatically creates a "started" attempt if none exists.
 */
export async function getChallengeForTester(
  challengeId: string,
  userId: string,
  locale: Locale,
): Promise<Result<{ challenge: TesterChallenge; userStatus: ChallengeStatus; activeAttemptId: string | null }>> {
  try {
    const supabase = await createClient()

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId)

    let query = supabase
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
        module_id,
        challenge_type,
        lab_template,
        lab_template_id,
        scenario,
        scenario_en,
        scenario_ar,
        instructions,
        instructions_en,
        instructions_ar,
        sort_order,
        workflow_type,
        status,
        practical_app_key
      `)

    if (isUuid) {
      query = query.eq('id', challengeId)
    } else {
      query = query.or(`id.eq.${challengeId},slug.eq.${challengeId}`)
    }

    const { data: challenge, error: challengeError } = await query.maybeSingle()

    if (challengeError || !challenge) {
      return { data: null, error: 'challenge_not_found' }
    }

    // ── Tester visibility rules ─────────────────────────────────────────────
    const challengeRow = challenge as Record<string, unknown>
    const workflowType = (challengeRow.workflow_type as string | null) ?? 'legacy'
    const statusValue = (challengeRow.status as string | null) ?? (challengeRow.is_active ? 'published' : 'draft')

    // Must be published or active
    if (statusValue !== 'published' && !challenge.is_active) {
      return { data: null, error: 'challenge_not_found' }
    }

    // Practical challenges must have a valid practical_app_key
    if (workflowType === 'practical' && !challengeRow.practical_app_key) {
      return { data: null, error: 'challenge_not_found' }
    }
    // ── End visibility rules ────────────────────────────────────────────────

    // Check lesson-unlock state (only block if lesson is found and explicitly locked)
    const lessonId = typeof challengeRow.lesson_id === 'string' ? challengeRow.lesson_id : null
    if (lessonId) {
      const overview = await getAcademyLearningOverview(userId, locale)
      const linkedLesson = overview.data?.lessons.find((lesson) => lesson.id === lessonId)
      if (linkedLesson && linkedLesson.is_unlocked === false) {
        return { data: null, error: 'challenge_not_found' }
      }
    }

    // Find the most recent active (non-terminal) attempt, or the most recent overall
    const { data: activeAttempt } = await supabase
      .from('challenge_attempts')
      .select('id, status')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .in('status', ['started', 'submitted', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let attemptId: string | null = activeAttempt?.id ?? null
    let attemptStatus: string | null = activeAttempt?.status ?? null

    if (!activeAttempt) {
      // Check for a terminal attempt (approved/rejected)
      const { data: lastAttempt } = await supabase
        .from('challenge_attempts')
        .select('id, status')
        .eq('user_id', userId)
        .eq('challenge_id', challenge.id)
        .in('status', ['approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastAttempt) {
        // Use the last terminal attempt for display — no auto-create on approved/rejected
        attemptId = lastAttempt.id
        attemptStatus = lastAttempt.status
      } else {
        // No attempt at all — auto-create a "started" attempt
        const { data: newAttempt } = await supabase
          .from('challenge_attempts')
          .insert({
            user_id: userId,
            challenge_id: challenge.id,
            status: 'started',
          })
          .select('id')
          .single()

        if (newAttempt) {
          attemptId = newAttempt.id
          attemptStatus = 'started'
        }
      }
    }

    const userStatus = deriveStatus(attemptStatus)
    const localizedChallenge: TesterChallenge = {
      id: challenge.id,
      title: localizedString(challengeRow, locale, 'title', 'title'),
      description: localizedString(challengeRow, locale, 'description', 'description'),
      difficulty: challenge.difficulty,
      base_xp_reward: challenge.base_xp_reward,
      is_active: challenge.is_active,
      lesson_id: challenge.lesson_id,
      challenge_type: challenge.challenge_type,
      workflow_type: workflowType,
      practical_app_key: (challengeRow.practical_app_key as string | null) ?? null,
      lab_template: challenge.lab_template,
      lab_template_id: challenge.lab_template_id ?? null,
      scenario: localizedString(challengeRow, locale, 'scenario', 'scenario') || null,
      instructions: localizedString(challengeRow, locale, 'instructions', 'instructions') || null,
      sort_order: challenge.sort_order,
    }

    return { data: { challenge: localizedChallenge, userStatus, activeAttemptId: attemptId }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Creates a fresh "started" attempt for a user on a challenge.
 * Fails if an active attempt already exists.
 */
export async function createChallengeAttempt(
  userId: string,
  challengeId: string,
): Promise<Result<{ id: string }>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('challenge_attempts')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        status: 'started',
      })
      .select('id')
      .single()

    if (error || !data) {
      const isConflict = error?.message?.includes('active attempt already exists')
      return {
        data: null,
        error: isConflict ? 'active_attempt_exists' : 'Failed to create attempt.',
      }
    }

    return { data: { id: data.id }, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Gets the current active attempt for a user on a challenge.
 * Returns null data (not an error) if no active attempt exists.
 */
export async function getActiveAttempt(
  userId: string,
  challengeId: string,
): Promise<Result<{ id: string; status: string } | null>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('challenge_attempts')
      .select('id, status')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .in('status', ['started', 'submitted', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { data: null, error: 'Failed to fetch active attempt.' }
    }

    return { data: data ?? null, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}
