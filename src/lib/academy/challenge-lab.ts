import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { type Locale } from '@/i18n/config'
import { localizedString } from '@/lib/i18n/content'

type BugReport = Database['public']['Tables']['bug_reports']['Row']
type ChallengeRow = Database['public']['Tables']['challenges']['Row']

export interface ChallengeLabData {
  id: string
  title: string
  description: string
  difficulty: ChallengeRow['difficulty']
  base_xp_reward: number
  challenge_type: string
  lab_template: string | null
  scenario: string | null
  instructions: string | null
  is_active: boolean | null
}

export interface ChallengeLabResult {
  challenge: ChallengeLabData
  previousReports: BugReport[]
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Fetches all data needed to render a Challenge Lab page for a tester.
 *
 * - Loads challenge metadata (never hidden_bugs)
 * - Loads the tester's own previous reports for this challenge
 * - Upserts challenge_progress to "in_progress" if not already submitted
 *
 * Security:
 * - Uses anon key only (no service_role)
 * - RLS-compatible queries
 * - Never fetches hidden_bugs table
 */
export async function getTesterChallengeLab(
  challengeId: string,
  userId: string,
  locale: Locale,
): Promise<Result<ChallengeLabResult>> {
  try {
    const supabase = await createClient()

    // Fetch challenge (public fields only — no hidden_bugs join)
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
        challenge_type,
        lab_template,
        scenario,
        scenario_en,
        scenario_ar,
        instructions,
        instructions_en,
        instructions_ar,
        is_active
      `)
      .eq('id', challengeId)
      .eq('is_active', true)
      .single()

    if (challengeError || !challenge) {
      return { data: null, error: 'challenge_not_found' }
    }

    const challengeRow = challenge as Record<string, unknown>

    const localizedChallenge: ChallengeLabData = {
      id: challenge.id,
      title: localizedString(challengeRow, locale, 'title', 'title'),
      description: localizedString(challengeRow, locale, 'description', 'description'),
      difficulty: challenge.difficulty,
      base_xp_reward: challenge.base_xp_reward,
      challenge_type: challenge.challenge_type,
      lab_template: challenge.lab_template,
      scenario: localizedString(challengeRow, locale, 'scenario', 'scenario') || null,
      instructions: localizedString(challengeRow, locale, 'instructions', 'instructions') || null,
      is_active: challenge.is_active,
    }

    // Fetch tester's own reports for this challenge
    const { data: reports } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false })

    // Ensure an active attempt exists and upsert challenge_progress (non-blocking)
    await ensureActiveAttemptAndProgress(supabase, challengeId, userId)

    return {
      data: {
        challenge: localizedChallenge,
        previousReports: reports ?? [],
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Ensures an active attempt exists for this user+challenge (creates one if not)
 * and upserts challenge_progress. Non-blocking — failures are silently ignored.
 */
async function ensureActiveAttemptAndProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challengeId: string,
  userId: string,
): Promise<void> {
  try {
    const now = new Date().toISOString()

    // ── 1. Ensure a started attempt exists ──────────────────────────────────
    const { data: activeAttempt } = await supabase
      .from('challenge_attempts')
      .select('id, status')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .in('status', ['started', 'submitted', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!activeAttempt) {
      // Check for terminal attempts — only auto-create if none exist at all
      const { data: terminalAttempt } = await supabase
        .from('challenge_attempts')
        .select('id')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .in('status', ['approved', 'rejected'])
        .limit(1)
        .maybeSingle()

      if (!terminalAttempt) {
        await supabase
          .from('challenge_attempts')
          .insert({
            user_id: userId,
            challenge_id: challengeId,
            status: 'started',
          })
      }
    }

    // ── 2. Upsert challenge_progress ────────────────────────────────────────
    const { data: existingProgress } = await supabase
      .from('challenge_progress')
      .select('status')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .maybeSingle()

    if (!existingProgress) {
      await supabase.from('challenge_progress').insert({
        user_id: userId,
        challenge_id: challengeId,
        status: 'in_progress',
        started_at: now,
      })
    } else if (existingProgress.status === 'not_started') {
      await supabase
        .from('challenge_progress')
        .update({ status: 'in_progress', started_at: now })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
    }
  } catch {
    // Non-blocking — do not prevent lab from loading
  }
}
