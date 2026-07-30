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
    const supabase = await createClient()

    const { data: challenges, error: challengesError } = await supabase
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
        is_required,
        practical_app_key,
        workflow_type,
        status
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (challengesError || !challenges) {
      return { data: [], error: null }
    }

    const challengeIds = challenges.map((c) => c.id)

    const { data: attempts } = challengeIds.length > 0
      ? await supabase
          .from('challenge_attempts')
          .select('id, challenge_id, status, updated_at')
          .eq('user_id', userId)
          .in('challenge_id', challengeIds)
          .order('updated_at', { ascending: true })
      : { data: [] }

    const attemptStatusMap = new Map<string, string>()
    const activeAttemptMap = new Map<string, string>()

    for (const a of (attempts ?? [])) {
      if (a.challenge_id && a.status) {
        attemptStatusMap.set(a.challenge_id, a.status)
        if (a.id) activeAttemptMap.set(a.challenge_id, a.id)
      }
    }

    const list: ChallengeWithStatus[] = challenges.map((ch) => {
      const row = ch as Record<string, unknown>
      return {
        id: ch.id,
        title: localizedString(row, locale, 'title', 'title'),
        description: localizedString(row, locale, 'description', 'description'),
        difficulty: ch.difficulty as ChallengeWithStatus['difficulty'],
        base_xp_reward: ch.base_xp_reward ?? 100,
        is_active: ch.is_active,
        lesson_id: ch.lesson_id,
        challenge_type: ch.challenge_type ?? 'bug_hunt',
        workflow_type: (ch as any).workflow_type ?? 'legacy',
        practical_app_key: (ch as any).practical_app_key ?? null,
        lab_template: ch.lab_template,
        lab_template_id: ch.lab_template_id,
        scenario: localizedString(row, locale, 'scenario', 'scenario') || null,
        instructions: localizedString(row, locale, 'instructions', 'instructions') || null,
        sort_order: ch.sort_order ?? 0,
        userStatus: deriveStatus(attemptStatusMap.get(ch.id) ?? null),
        activeAttemptId: activeAttemptMap.get(ch.id) ?? null,
      }
    })

    return { data: list, error: null }
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
    const isNumeric = /^\d+$/.test(challengeId)

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
    } else if (isNumeric) {
      query = query.or(`sort_order.eq.${challengeId},slug.eq.${challengeId}`)
    } else {
      query = query.eq('slug', challengeId)
    }

    const { data: challenge, error: challengeError } = await query.maybeSingle()

    if (challengeError || !challenge) {
      return { data: null, error: 'challenge_not_found' }
    }

    // ── Tester visibility rules ─────────────────────────────────────────────
    const challengeRow = challenge as Record<string, unknown>
    const workflowType = (challengeRow.workflow_type as string | null) ?? 'legacy'
    const statusValue = (challengeRow.status as string | null) ?? (challenge.is_active ? 'published' : 'draft')

    // Must be published or active
    if (statusValue !== 'published' && !challenge.is_active) {
      return { data: null, error: 'challenge_not_found' }
    }
    // ── End visibility rules ────────────────────────────────────────────────

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
  } catch (err) {
    console.error('getChallengeForTester error:', err)
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
