import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type AiEvaluation = Database['public']['Tables']['ai_evaluations']['Row']

export interface EvaluationWithReport extends AiEvaluation {
  report_title: string | null
}

type Result<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Fetches AI evaluations connected only to the current tester's own reports.
 * RLS ensures users can only see their own evaluations.
 */
export async function getTesterAiEvaluations(
  userId: string,
): Promise<Result<EvaluationWithReport[]>> {
  try {
    const supabase = await createClient()

    // Join via bug_reports to ensure user_id scoping — RLS handles it,
    // but we explicitly filter through the user's own reports.
    const { data, error } = await supabase
      .from('ai_evaluations')
      .select(`
        id,
        report_id,
        matched_hidden_bug_id,
        ai_score,
        quality_feedback,
        earned_xp,
        evaluated_at,
        bug_reports!inner (
          user_id,
          title
        )
      `)
      .eq('bug_reports.user_id', userId)
      .order('evaluated_at', { ascending: false })

    if (error) {
      return { data: null, error: 'Failed to load AI evaluations.' }
    }

    const evaluations: EvaluationWithReport[] = (data ?? []).map((row) => ({
      id: row.id,
      report_id: row.report_id,
      // Never expose matched_hidden_bug_id meaningfully to the UI
      matched_hidden_bug_id: null,
      ai_score: row.ai_score,
      quality_feedback: row.quality_feedback,
      earned_xp: row.earned_xp,
      evaluated_at: row.evaluated_at,
      report_title: Array.isArray(row.bug_reports)
        ? (row.bug_reports[0]?.title ?? null)
        : ((row.bug_reports as { title: string } | null)?.title ?? null),
    }))

    return { data: evaluations, error: null }
  } catch {
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

/**
 * Count of AI evaluations for the current tester.
 */
export async function getTesterAiEvaluationCount(
  userId: string,
): Promise<number> {
  try {
    const supabase = await createClient()

    const { count } = await supabase
      .from('ai_evaluations')
      .select('id, bug_reports!inner(user_id)', { count: 'exact', head: true })
      .eq('bug_reports.user_id', userId)

    return count ?? 0
  } catch {
    return 0
  }
}
