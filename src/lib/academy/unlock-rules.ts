import 'server-only'
import { createClient } from '@/lib/supabase/server'

interface UnlockStatus {
  isUnlocked: boolean
  reason: 'unlocked' | 'previous_lesson_locked' | 'challenge_required' | 'not_found'
}

/**
 * Evaluates if a tester can access a specific lesson based on sequential rules.
 */
export async function checkLessonUnlockStatus(userId: string, lessonId: string): Promise<UnlockStatus> {
  const supabase = await createClient()

  // 1. Get the target lesson and its path
  const { data: targetLesson, error: lessonError } = await supabase
    .from('lessons')
    .select('learning_path_id, sort_order, is_published')
    .eq('id', lessonId)
    .single()

  if (lessonError || !targetLesson || !targetLesson.is_published) {
    return { isUnlocked: false, reason: 'not_found' }
  }

  // 2. If it's the very first lesson in the path, it's unlocked
  const { data: previousLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('learning_path_id', targetLesson.learning_path_id)
    .eq('is_published', true)
    .lt('sort_order', targetLesson.sort_order)
    .order('sort_order', { ascending: true })

  if (!previousLessons || previousLessons.length === 0) {
    return { isUnlocked: true, reason: 'unlocked' }
  }

  // 3. Check if all previous lessons are completed
  const previousLessonIds = previousLessons.map((l) => l.id)
  const { data: completedProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .in('lesson_id', previousLessonIds)
    .not('completed_at', 'is', null)

  if (!completedProgress || completedProgress.length < previousLessons.length) {
    return { isUnlocked: false, reason: 'previous_lesson_locked' }
  }

  // 4. For the immediate preceding lesson, check if it had a required challenge
  const immediatePrecedingLessonId = previousLessonIds[previousLessonIds.length - 1]
  const { data: requiredChallenge } = await supabase
    .from('challenges')
    .select('id, is_required, unlock_after_lesson')
    .eq('lesson_id', immediatePrecedingLessonId)
    .eq('is_active', true)
    .eq('is_required', true)
    .maybeSingle()

  if (requiredChallenge && requiredChallenge.unlock_after_lesson) {
    // Check if the user has an approved and passed attempt for this challenge
    const { data: passedAttempt } = await supabase
      .from('challenge_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_id', requiredChallenge.id)
      .eq('is_passed', true)
      .limit(1)
      .maybeSingle()

    const hasSubmitted = !!passedAttempt

    if (!hasSubmitted) {
      return { isUnlocked: false, reason: 'challenge_required' }
    }
  }

  return { isUnlocked: true, reason: 'unlocked' }
}

export type LessonFlowStatus = 'completed' | 'current' | 'locked'

export interface LessonUnlockInput {
  id: string
  isCompleted: boolean
  requiredChallengeId: string | null
  requiredChallengeSubmitted: boolean
}

/**
 * Calculates unlock status and flow state for an ordered list of lessons.
 */
export function calculateLessonUnlockStates(
  lessons: LessonUnlockInput[]
): Map<string, { isUnlocked: boolean; status: LessonFlowStatus }> {
  const states = new Map<string, { isUnlocked: boolean; status: LessonFlowStatus }>()
  
  let previousIsUnlockedAndCompleted = true

  for (const lesson of lessons) {
    const isLocked = !previousIsUnlockedAndCompleted

    let status: LessonFlowStatus = 'locked'
    if (!isLocked) {
      status = lesson.isCompleted ? 'completed' : 'current'
    }

    states.set(lesson.id, {
      isUnlocked: !isLocked,
      status,
    })

    let nextCanBeUnlocked = lesson.isCompleted
    if (nextCanBeUnlocked && lesson.requiredChallengeId && !lesson.requiredChallengeSubmitted) {
      nextCanBeUnlocked = false
    }

    previousIsUnlockedAndCompleted = nextCanBeUnlocked
  }

  return states
}

