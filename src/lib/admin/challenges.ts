import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import type { ChallengeFormValues } from '@/lib/validations/challenge'

type Challenge = Database['public']['Tables']['challenges']['Row']

export interface ChallengeWithBugCount extends Challenge {
  hidden_bugs_count: number
}

interface DataResult<T> {
  data: T | null
  error: string | null
}

/**
 * Fetch all challenges with hidden bug counts.
 * Used on the admin challenges list page.
 */
export async function getAdminChallenges(): Promise<DataResult<ChallengeWithBugCount[]>> {
  const supabase = await createClient()

  const { data: challenges, error: challengesError } = await supabase
    .from('challenges')
    .select('*')
    .order('title', { ascending: true })

  if (challengesError) {
    return { data: null, error: 'Failed to load challenges.' }
  }

  // Fetch hidden bug counts grouped by challenge_id
  const { data: bugs, error: bugsError } = await supabase
    .from('hidden_bugs')
    .select('challenge_id')

  if (bugsError) {
    return { data: null, error: 'Failed to load hidden bugs.' }
  }

  // Count bugs per challenge
  const bugCountMap = new Map<string, number>()
  for (const bug of bugs) {
    if (bug.challenge_id) {
      bugCountMap.set(bug.challenge_id, (bugCountMap.get(bug.challenge_id) ?? 0) + 1)
    }
  }

  const challengesWithCounts: ChallengeWithBugCount[] = challenges.map((c) => ({
    ...c,
    hidden_bugs_count: bugCountMap.get(c.id) ?? 0,
  }))

  return { data: challengesWithCounts, error: null }
}

/**
 * Fetch a single challenge by ID.
 */
export async function getAdminChallengeById(id: string): Promise<DataResult<Challenge>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: 'Challenge not found.' }
  }

  return { data, error: null }
}

/**
 * Create a new challenge.
 */
export async function createChallenge(input: ChallengeFormValues): Promise<DataResult<Challenge>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      title: input.title_en,
      title_en: input.title_en,
      title_ar: input.title_ar,
      description: input.description_en,
      description_en: input.description_en,
      description_ar: input.description_ar,
      scenario: input.scenario_en || null,
      scenario_en: input.scenario_en || null,
      scenario_ar: input.scenario_ar || null,
      instructions: input.instructions_en || null,
      instructions_en: input.instructions_en || null,
      instructions_ar: input.instructions_ar || null,
      lesson_id: input.lesson_id || null,
      module_id: input.module_id || null,
      challenge_type: input.challenge_type,
      lab_template: input.lab_template || null,
      difficulty: input.difficulty,
      base_xp_reward: input.base_xp_reward,
      is_required: input.is_required,
      is_active: input.is_active,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase Challenge Creation Error:', error)
    return { data: null, error: `Failed to create challenge: ${error.message || JSON.stringify(error)}` }
  }

  return { data: data as unknown as Challenge, error: null }
}

/**
 * Update an existing challenge.
 */
export async function updateChallenge(id: string, input: ChallengeFormValues): Promise<DataResult<Challenge>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('challenges')
    .update({
      title: input.title_en,
      title_en: input.title_en,
      title_ar: input.title_ar,
      description: input.description_en,
      description_en: input.description_en,
      description_ar: input.description_ar,
      scenario: input.scenario_en || null,
      scenario_en: input.scenario_en || null,
      scenario_ar: input.scenario_ar || null,
      instructions: input.instructions_en || null,
      instructions_en: input.instructions_en || null,
      instructions_ar: input.instructions_ar || null,
      lesson_id: input.lesson_id || null,
      module_id: input.module_id || null,
      challenge_type: input.challenge_type,
      lab_template: input.lab_template || null,
      difficulty: input.difficulty,
      base_xp_reward: input.base_xp_reward,
      is_required: input.is_required,
      is_active: input.is_active,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Supabase Challenge Update Error:', error)
    return { data: null, error: `Failed to update challenge: ${error.message || JSON.stringify(error)}` }
  }

  return { data: data as unknown as Challenge, error: null }
}

/**
 * Toggle the active status of a challenge.
 */
export async function toggleChallengeStatus(id: string, isActive: boolean): Promise<DataResult<Challenge>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('challenges')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: 'Failed to update challenge status.' }
  }

  return { data, error: null }
}
