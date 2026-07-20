'use server'

import { createClient } from '@/lib/supabase/server'
import { type Locale } from '@/i18n/config'
import { localizedString } from '@/lib/i18n/content'
import { calculateLessonUnlockStates, type LessonFlowStatus } from '@/lib/academy/unlock-rules'
import type { ChallengeWithStatus } from '@/lib/academy/challenges'

interface DataResult<T> {
  data: T | null
  error: string | null
}

type RecordRow = Record<string, unknown>

export interface LearningOverview {
  currentPathTitle: string | null
  currentPathDescription: string | null
  nextLessonId: string | null
  nextLessonTitle: string | null
  nextLessonSummary: string | null
  nextActionHref: string | null
  nextActionKind: 'lesson' | 'challenge' | 'complete' | null
  completedCount: number
  totalCount: number
  progressPercent: number
  lessons: LessonProgressItem[]
  practiceChallenges: ChallengeWithStatus[]
}

export interface LessonProgressItem {
  id: string
  title: string
  summary: string | null
  sort_order: number
  estimated_minutes: number
  difficulty: string
  is_completed: boolean
  is_unlocked: boolean
  status: LessonFlowStatus
  related_challenge_id: string | null
  related_challenge_title: string | null
  challenge_submitted: boolean
}

function toString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function toBoolean(value: unknown): boolean {
  return value === true
}

function deriveChallengeStatus(attemptStatus: string | null): ChallengeWithStatus['userStatus'] {
  if (!attemptStatus) return 'not_started'
  if (attemptStatus === 'started') return 'in_progress'
  if (attemptStatus === 'submitted') return 'pending_review'
  if (attemptStatus === 'reviewing') return 'reviewing'
  if (attemptStatus === 'approved') return 'approved'
  if (attemptStatus === 'rejected') return 'rejected'
  return 'not_started'
}

/**
 * Get full learning overview for the tester academy dashboard.
 */
export async function getAcademyLearningOverview(
  userId: string,
  locale: Locale,
): Promise<DataResult<LearningOverview>> {
  const supabase = await createClient()

  const { data: paths } = await supabase
    .from('learning_paths')
    .select('id, title, description, title_en, title_ar, description_en, description_ar')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(1)

  const currentPath = (paths?.[0] ?? null) as RecordRow | null

  if (!currentPath) {
    return {
      data: {
        currentPathTitle: null,
        currentPathDescription: null,
        nextLessonId: null,
        nextLessonTitle: null,
        nextLessonSummary: null,
        nextActionHref: null,
        nextActionKind: null,
        completedCount: 0,
        totalCount: 0,
        progressPercent: 0,
        lessons: [],
        practiceChallenges: [],
      },
      error: null,
    }
  }

  const pathId = toString(currentPath.id)
  if (!pathId) {
    return { data: null, error: 'Failed to load learning path.' }
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select(`
      id,
      title,
      title_en,
      title_ar,
      summary,
      summary_en,
      summary_ar,
      sort_order,
      estimated_minutes,
      difficulty
    `)
    .eq('learning_path_id', pathId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    return { data: null, error: 'Failed to load lessons.' }
  }

  const lessonRows = ((lessons ?? []) as RecordRow[]).map((lesson) => ({
    row: lesson,
    id: toString(lesson.id) ?? '',
  })).filter((lesson) => lesson.id.length > 0)

  const lessonIds = lessonRows.map((lesson) => lesson.id)

  const [{ data: progressData }, { data: challengeData }] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', userId),
    lessonIds.length > 0
      ? supabase
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
            sort_order,
            is_required
          `)
          .eq('is_active', true)
          .in('lesson_id', lessonIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const challengeRows = (challengeData ?? []) as RecordRow[]
  const challengeIds = challengeRows
    .map((challenge) => toString(challenge.id))
    .filter((id): id is string => Boolean(id))

  const { data: attemptsData } = challengeIds.length > 0
    ? await supabase
        .from('challenge_attempts')
        .select('id, challenge_id, status, updated_at')
        .eq('user_id', userId)
        .in('challenge_id', challengeIds)
        .order('updated_at', { ascending: true })
    : { data: [] }

  const completedLessonIds = new Set(
    ((progressData ?? []) as RecordRow[])
      .filter((progress) => Boolean(progress.completed_at))
      .map((progress) => toString(progress.lesson_id))
      .filter((id): id is string => Boolean(id)),
  )

  const attemptStatusByChallengeId = new Map<string, string>()
  const activeAttemptIdByChallengeId = new Map<string, string>()
  const submittedChallengeIds = new Set<string>()

  for (const row of (attemptsData ?? []) as RecordRow[]) {
    const cid = toString(row.challenge_id)
    const status = toString(row.status)
    if (cid && status) {
      attemptStatusByChallengeId.set(cid, status)
      if (toString(row.id)) {
        activeAttemptIdByChallengeId.set(cid, toString(row.id)!)
      }
      // A challenge is considered "submitted" if the attempt is not just started
      if (status !== 'started') {
        submittedChallengeIds.add(cid)
      }
    }
  }

  const challengeByLessonId = new Map<string, RecordRow>()
  for (const challenge of challengeRows) {
    const lessonId = toString(challenge.lesson_id)
    if (lessonId && !challengeByLessonId.has(lessonId)) {
      challengeByLessonId.set(lessonId, challenge)
    }
  }

  const unlockInputs = lessonRows.map(({ id }) => {
    const challenge = challengeByLessonId.get(id)
    const challengeId = challenge ? toString(challenge.id) : null
    return {
      id,
      isCompleted: completedLessonIds.has(id),
      requiredChallengeId: challenge && challenge.is_required !== false ? challengeId : null,
      requiredChallengeSubmitted: challengeId ? submittedChallengeIds.has(challengeId) : false,
    }
  })

  const unlockStates = calculateLessonUnlockStates(unlockInputs)

  const lessonItems: LessonProgressItem[] = lessonRows.map(({ row, id }) => {
    const challenge = challengeByLessonId.get(id)
    const challengeId = challenge ? toString(challenge.id) : null
    const state = unlockStates.get(id)

    return {
      id,
      title: localizedString(row, locale, 'title', 'title'),
      summary: localizedString(row, locale, 'summary', 'summary') || null,
      sort_order: toNumber(row.sort_order, 0),
      estimated_minutes: toNumber(row.estimated_minutes, 10),
      difficulty: toString(row.difficulty) ?? 'Beginner',
      is_completed: completedLessonIds.has(id),
      is_unlocked: state?.isUnlocked ?? false,
      status: state?.status ?? 'locked',
      related_challenge_id: challengeId,
      related_challenge_title: challenge
        ? localizedString(challenge, locale, 'title', 'title')
        : null,
      challenge_submitted: challengeId ? submittedChallengeIds.has(challengeId) : false,
    }
  })

  const completedCount = lessonItems.filter((lesson) => lesson.status === 'completed').length
  const totalCount = lessonItems.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const currentLesson = lessonItems.find((lesson) => lesson.status === 'current') ?? null

  const practiceChallenges: ChallengeWithStatus[] = challengeRows
    .filter((challenge) => {
      const lessonId = toString(challenge.lesson_id)
      const lesson = lessonItems.find((item) => item.id === lessonId)
      return lesson?.is_unlocked === true
    })
    .map((challenge) => {
      const id = toString(challenge.id) ?? ''
      return {
        id,
        title: localizedString(challenge, locale, 'title', 'title'),
        description: localizedString(challenge, locale, 'description', 'description'),
        difficulty: (toString(challenge.difficulty) ?? 'Beginner') as ChallengeWithStatus['difficulty'],
        base_xp_reward: toNumber(challenge.base_xp_reward, 100),
        is_active: true,
        lesson_id: toString(challenge.lesson_id),
        challenge_type: toString(challenge.challenge_type) ?? 'bug_hunt',
        lab_template: toString(challenge.lab_template),
        lab_template_id: toString(challenge.lab_template_id),
        scenario: localizedString(challenge, locale, 'scenario', 'scenario') || null,
        instructions: localizedString(challenge, locale, 'instructions', 'instructions') || null,
        sort_order: toNumber(challenge.sort_order, 0),
        userStatus: deriveChallengeStatus(attemptStatusByChallengeId.get(id) ?? null),
        activeAttemptId: activeAttemptIdByChallengeId.get(id) ?? null,
      }
    })

  const currentChallengePending =
    currentLesson?.is_completed === true &&
    currentLesson.related_challenge_id &&
    !currentLesson.challenge_submitted

  return {
    data: {
      currentPathTitle: localizedString(currentPath, locale, 'title', 'title'),
      currentPathDescription: localizedString(currentPath, locale, 'description', 'description'),
      nextLessonId: currentLesson?.id ?? null,
      nextLessonTitle: currentLesson?.title ?? null,
      nextLessonSummary: currentLesson?.summary ?? null,
      nextActionHref: currentChallengePending
        ? `/academy/challenges/${currentLesson.related_challenge_id}`
        : currentLesson
          ? `/academy/lessons/${currentLesson.id}`
          : null,
      nextActionKind: currentChallengePending ? 'challenge' : currentLesson ? 'lesson' : 'complete',
      completedCount,
      totalCount,
      progressPercent,
      lessons: lessonItems,
      practiceChallenges,
    },
    error: null,
  }
}

/**
 * Mark a lesson as opened by the tester (upsert last_opened_at).
 */
export async function markLessonOpened(userId: string, lessonId: string): Promise<DataResult<{ success: boolean }>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    )

  if (error) {
    return { data: null, error: 'Failed to track lesson progress.' }
  }

  return { data: { success: true }, error: null }
}

/**
 * Mark a lesson as completed by the tester.
 */
export async function markLessonCompleted(userId: string, lessonId: string): Promise<DataResult<{ success: boolean }>> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    )

  if (error) {
    return { data: null, error: 'Failed to mark lesson as completed.' }
  }

  return { data: { success: true }, error: null }
}
