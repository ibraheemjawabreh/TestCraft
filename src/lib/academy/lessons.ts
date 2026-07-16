'use server'

import { createClient } from '@/lib/supabase/server'
import { getLocalizedContent, getLocalizedArray } from '@/lib/i18n/content'
import { Locale } from '@/i18n/config'
import { checkLessonUnlockStatus } from './unlock-rules'

interface DataResult<T> {
  data: T | null
  error: string | null
}

export interface TesterLesson {
  id: string
  learning_path_id: string
  title: string
  slug: string
  summary: string
  content: string
  objectives: string[]
  estimated_minutes: number
  difficulty: string
  sort_order: number
  is_completed: boolean
  is_locked: boolean
  lock_reason?: string
  related_challenge_id?: string | null
  learning_path_title?: string | null
}

export interface PathTimelineLesson {
  id: string
  title: string
  slug: string
  estimated_minutes: number
  sort_order: number
  is_completed: boolean
  is_locked: boolean
}

/**
 * Fetch a specific lesson for the tester, including localization and lock status.
 */
export async function getTesterLesson(userId: string, lessonId: string, locale: Locale): Promise<DataResult<TesterLesson>> {
  const supabase = await createClient()

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*, learning_paths(title_en, title_ar)')
    .eq('id', lessonId)
    .eq('is_published', true)
    .single()

  if (lessonError || !lesson) {
    return { data: null, error: 'Lesson not found or not published.' }
  }

  // Check unlock status
  const unlockStatus = await checkLessonUnlockStatus(userId, lesson.id)

  // Get completion status
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  const is_completed = !!progress?.completed_at

  // Get the related challenge when one is attached.
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id')
    .eq('lesson_id', lesson.id)
    .eq('is_active', true)
    .maybeSingle()

  return {
    data: {
      id: lesson.id,
      learning_path_id: lesson.learning_path_id,
      title: getLocalizedContent(lesson, 'title', locale),
      slug: lesson.slug,
      summary: getLocalizedContent(lesson, 'summary', locale),
      content: getLocalizedContent(lesson, 'content', locale),
      objectives: getLocalizedArray(lesson, 'objectives', locale),
      estimated_minutes: lesson.estimated_minutes,
      difficulty: lesson.difficulty,
      sort_order: lesson.sort_order,
      is_completed,
      is_locked: !unlockStatus.isUnlocked,
      lock_reason: unlockStatus.reason,
      related_challenge_id: challenge?.id || null,
      learning_path_title: lesson.learning_paths ? getLocalizedContent(lesson.learning_paths, 'title', locale) : null,
    },
    error: null,
  }
}

/**
 * Fetch all lessons in a path to build the timeline, indicating which are completed, locked, or available.
 */
export async function getPathTimeline(userId: string, pathId: string, locale: Locale): Promise<DataResult<PathTimelineLesson[]>> {
  const supabase = await createClient()

  // 1. Get all published lessons in the path
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('*')
    .eq('learning_path_id', pathId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (lessonsError || !lessons) {
    return { data: null, error: 'Failed to load timeline.' }
  }

  // 2. Get user progress
  const lessonIds = lessons.map(l => l.id)
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds)

  const completedSet = new Set(
    progress?.filter(p => p.completed_at).map(p => p.lesson_id) || []
  )

  // 3. To determine locked status efficiently, we'll iterate through the sorted lessons.
  // A lesson is unlocked if it is the first lesson, OR if the previous lesson is completed 
  // AND the required challenge for the previous lesson is submitted.
  // For the MVP, we will reuse `checkLessonUnlockStatus` for accuracy, although it runs queries in a loop,
  // we can optimize it if the timeline is huge. For now, we will do sequential checks.
  
  const timeline: PathTimelineLesson[] = []
  
  // Optimization: since we are fetching the whole path, we can calculate lock status in memory 
  // except for challenges. Let's fetch all relevant challenges first.
  const { data: challenges } = await supabase
    .from('challenges')
    .select('id, lesson_id, is_required, unlock_after_lesson')
    .in('lesson_id', lessonIds)
    .eq('is_active', true)
    .eq('is_required', true)
    
  const requiredChallengeMap = new Map(challenges?.map(c => [c.lesson_id, c]) || [])
  
  let challengeProgressSet = new Set<string>()
  if (challenges && challenges.length > 0) {
    const challengeIds = challenges.map(c => c.id)
    const { data: passedAttempts } = await supabase
      .from('challenge_attempts')
      .select('challenge_id')
      .eq('user_id', userId)
      .in('challenge_id', challengeIds)
      .eq('is_passed', true)
      
    passedAttempts?.forEach(p => {
      challengeProgressSet.add(p.challenge_id)
    })
  }

  let previousIsUnlockedAndCompleted = true

  for (const lesson of lessons) {
    const isCompleted = completedSet.has(lesson.id)
    
    // A lesson is locked if the previous lesson wasn't unlocked & completed
    let isLocked = !previousIsUnlockedAndCompleted

    timeline.push({
      id: lesson.id,
      title: getLocalizedContent(lesson, 'title', locale),
      slug: lesson.slug,
      estimated_minutes: lesson.estimated_minutes,
      sort_order: lesson.sort_order,
      is_completed: isCompleted,
      is_locked: isLocked,
    })

    // Determine if THIS lesson will unlock the NEXT lesson
    let nextCanBeUnlocked = isCompleted
    if (nextCanBeUnlocked) {
      const challenge = requiredChallengeMap.get(lesson.id)
      if (challenge && challenge.unlock_after_lesson) {
        if (!challengeProgressSet.has(challenge.id)) {
          nextCanBeUnlocked = false
        }
      }
    }

    previousIsUnlockedAndCompleted = nextCanBeUnlocked
  }

  return { data: timeline, error: null }
}

/**
 * Fetch the next unlocked but incomplete lesson for a user.
 */
export async function getNextLessonForTester(userId: string, locale: Locale): Promise<DataResult<{ id: string; title: string }>> {
  const supabase = await createClient()

  // For the MVP, we just fetch all active lessons, map them to progress, and find the first unlocked & incomplete one.
  // In a massive system, this would be optimized.
  const { data: paths } = await supabase
    .from('learning_paths')
    .select('id')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!paths || paths.length === 0) return { data: null, error: 'No paths found' }

  for (const path of paths) {
    const timelineResult = await getPathTimeline(userId, path.id, locale)
    if (timelineResult.data) {
      const next = timelineResult.data.find(l => !l.is_locked && !l.is_completed)
      if (next) {
        return { data: { id: next.id, title: next.title }, error: null }
      }
    }
  }

  return { data: null, error: 'No next lesson found' }
}
