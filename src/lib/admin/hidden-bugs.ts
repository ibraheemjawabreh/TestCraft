import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import type { HiddenBugFormValues } from '@/lib/validations/challenge'

type HiddenBug = Database['public']['Tables']['hidden_bugs']['Row']

interface DataResult<T> {
  data: T | null
  error: string | null
}

/**
 * Fetch all hidden bugs for a specific challenge.
 */
export async function getHiddenBugsByChallengeId(challengeId: string): Promise<DataResult<HiddenBug[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hidden_bugs')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('bug_title', { ascending: true })

  if (error) {
    return { data: null, error: 'Failed to load hidden bugs.' }
  }

  return { data, error: null }
}

/**
 * Create a new hidden bug for a challenge.
 */
export async function createHiddenBug(
  challengeId: string,
  input: HiddenBugFormValues,
): Promise<DataResult<HiddenBug>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hidden_bugs')
    .insert({
      challenge_id: challengeId,
      bug_title: input.bug_title,
      actual_severity: input.actual_severity,
      bonus_xp: input.bonus_xp,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: 'Failed to create hidden bug.' }
  }

  return { data, error: null }
}

/**
 * Update an existing hidden bug.
 */
export async function updateHiddenBug(
  id: string,
  input: HiddenBugFormValues,
): Promise<DataResult<HiddenBug>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hidden_bugs')
    .update({
      bug_title: input.bug_title,
      actual_severity: input.actual_severity,
      bonus_xp: input.bonus_xp,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: 'Failed to update hidden bug.' }
  }

  return { data, error: null }
}

/**
 * Delete a hidden bug by ID.
 */
export async function deleteHiddenBug(id: string): Promise<DataResult<null>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('hidden_bugs')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: 'Failed to delete hidden bug.' }
  }

  return { data: null, error: null }
}
