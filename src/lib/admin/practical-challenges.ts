import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import type { PracticalChallengeFormValues } from '@/lib/validations/practical-challenge'

type Challenge = Database['public']['Tables']['challenges']['Row']

interface DataResult<T> {
  data: T | null
  error: string | null
}

export async function createPracticalChallenge(input: PracticalChallengeFormValues): Promise<DataResult<Challenge>> {
  const supabase = await createClient()

  if (input.slug) {
    const { data: existing } = await supabase
      .from('challenges')
      .select('id')
      .eq('slug', input.slug)
      .maybeSingle()
    
    if (existing) {
      return { data: null, error: `A challenge with the slug "${input.slug}" already exists.` }
    }
  }

  // 1. Insert the Challenge
  const { data: challenge, error: challengeError } = await supabase
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
      difficulty: input.difficulty,
      base_xp_reward: input.base_xp_reward,
      is_required: input.is_required,
      is_active: input.is_active,
      practical_app_key: input.practical_app_key || null,
      practical_app_config: input.practical_app_config || {},
      slug: input.slug || null,
      learning_path_id: input.learning_path_id === 'none' ? null : (input.learning_path_id || null),
      sort_order: input.sort_order || 0,
      workflow_type: 'practical',
      status: input.is_active ? 'published' : 'draft',
    })
    .select()
    .single()

  if (challengeError) {
    console.error('Supabase Challenge Creation Error:', challengeError)
    return { data: null, error: `Failed to create challenge: ${challengeError.message}` }
  }

  // 2. Insert the embedded bugs
  if (input.embedded_bugs && input.embedded_bugs.length > 0) {
    const bugsToInsert = input.embedded_bugs.map(bug => ({
      challenge_id: challenge.id,
      bug_key: bug.bug_key,
      bug_title: bug.bug_title,
      description: bug.description || null,
      actual_severity: bug.actual_severity,
      bonus_xp: bug.bonus_xp,
      is_active: bug.is_active,
    }))

    const { error: bugsError } = await supabase
      .from('hidden_bugs')
      .insert(bugsToInsert)

    if (bugsError) {
      console.error('Supabase Hidden Bugs Creation Error:', bugsError)
      // Rollback is complex here without rpc, but let's just log for now
      return { data: null, error: `Failed to save bugs: ${bugsError.message}` }
    }
  }

  return { data: challenge as unknown as Challenge, error: null }
}

export async function updatePracticalChallenge(id: string, input: PracticalChallengeFormValues): Promise<DataResult<Challenge>> {
  const supabase = await createClient()

  if (input.slug) {
    const { data: existing } = await supabase
      .from('challenges')
      .select('id')
      .eq('slug', input.slug)
      .neq('id', id)
      .maybeSingle()
    
    if (existing) {
      return { data: null, error: `A challenge with the slug "${input.slug}" already exists.` }
    }
  }

  const { data: challenge, error: challengeError } = await supabase
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
      difficulty: input.difficulty,
      base_xp_reward: input.base_xp_reward,
      is_required: input.is_required,
      is_active: input.is_active,
      practical_app_key: input.practical_app_key || null,
      practical_app_config: input.practical_app_config || {},
      slug: input.slug || null,
      learning_path_id: input.learning_path_id === 'none' ? null : (input.learning_path_id || null),
      sort_order: input.sort_order || 0,
      workflow_type: 'practical',
      status: input.is_active ? 'published' : 'draft',
    })
    .eq('id', id)
    .select()
    .single()

  if (challengeError) {
    console.error('Supabase Challenge Update Error:', challengeError)
    return { data: null, error: `Failed to update challenge: ${challengeError.message}` }
  }

  // Handle bugs: We'll delete all old bugs for this challenge and re-insert the new ones to keep it simple.
  await supabase
    .from('hidden_bugs')
    .delete()
    .eq('challenge_id', id)

  if (input.embedded_bugs && input.embedded_bugs.length > 0) {
    const bugsToInsert = input.embedded_bugs.map(bug => ({
      challenge_id: id,
      bug_key: bug.bug_key,
      bug_title: bug.bug_title,
      description: bug.description || null,
      actual_severity: bug.actual_severity,
      bonus_xp: bug.bonus_xp,
      is_active: bug.is_active,
    }))

    const { error: bugsError } = await supabase
      .from('hidden_bugs')
      .insert(bugsToInsert)

    if (bugsError) {
      console.error('Supabase Hidden Bugs Update Error:', bugsError)
    }
  }

  return { data: challenge as unknown as Challenge, error: null }
}
