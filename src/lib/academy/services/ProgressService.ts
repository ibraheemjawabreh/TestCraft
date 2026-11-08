import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { LESSON_OPEN_INTERVAL_MS } from '@/lib/academy/lesson-open'

interface Result<T> {
  data: T | null
  error: string | null
}

/**
 * Insert once, or touch an existing visit only after the cooldown. Never
 * overwrite completion or started_at, even with concurrent opens/completion.
 */
export async function markLessonInProgress(
  userId: string,
  lessonId: string,
  hasProgress = false,
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<Result<boolean>> {
  try {
    const supabase = client ?? await createClient()
    const clock = Date.now()
    const now = new Date(clock).toISOString()

    if (hasProgress) {
      const { error } = await supabase.from('lesson_progress').update({ last_opened_at: now })
        .eq('user_id', userId).eq('lesson_id', lessonId)
        .lt('last_opened_at', new Date(clock - LESSON_OPEN_INTERVAL_MS).toISOString())
      return error ? { data: null, error: 'Failed to update lesson activity.' } : { data: true, error: null }
    }

    const { error } = await supabase.from('lesson_progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'in_progress',
        last_opened_at: now,
        started_at: now,
      },
      {
        onConflict: 'user_id,lesson_id',
        ignoreDuplicates: true,
      }
    )

    return error ? { data: null, error: 'Failed to track lesson progress.' } : { data: true, error: null }
  } catch (err) {
    console.error('markLessonInProgress error:', err)
    return { data: null, error: 'Failed to track lesson progress.' }
  }
}

/**
 * Mark a lesson as completed. Triggers module progress sync.
 */
export async function completeLessonAndSync(
  userId: string,
  lessonId: string
): Promise<Result<{ moduleCompleted: boolean; challengeUnlocked: boolean }>> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) return { data: null, error: 'Unauthorized' }
    const { data: lesson, error: accessError } = await supabase.from('lessons')
      .select('module_id,learning_path_id').eq('id',lessonId).eq('is_published',true).single()
    if (accessError || !lesson) return { data: null, error: 'Lesson unavailable' }
    if (lesson.module_id) {
      const { data: allowed, error: gateError } = await supabase.rpc('curriculum_can_read_lesson', { p_lesson:lessonId })
      if (gateError || !allowed) return { data: null, error: 'Module locked' }
    }
    // 1. Mark lesson as completed — the one critical write
    const { error: lessonErr } = await supabase.from('lesson_progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: 'completed',
        completed_at: now,
        last_opened_at: now,
      },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: false }
    )

    if (lessonErr) {
      return { data: null, error: 'Failed to complete lesson.' }
    }

    // The verified client can call the same atomic reward RPC directly. The
    // module reads need the saved lesson, but do not depend on the XP result.
    const moduleId = lesson.module_id
    const [reward, moduleTotals, moduleChallenge] = await Promise.all([
      supabase.rpc('curriculum_award_lesson', { p_lesson: lessonId }),
      moduleId ? supabase.rpc('curriculum_module_completion', { p_module: moduleId }) : null,
      moduleId ? supabase.from('challenges').select('id').eq('module_id', moduleId).eq('is_active', true).maybeSingle() : null,
    ])
    if (reward.error) throw new Error(reward.error.message)

    if (!moduleId || !moduleTotals || !moduleChallenge) {
      await syncLearningPathProgress(userId, lesson.learning_path_id, supabase)
      return { data: { moduleCompleted: false, challengeUnlocked: false }, error: null }
    }

    // Draft rows are hidden by learner RLS; aggregate counters come from SQL.
    if (moduleTotals.error || moduleChallenge.error) return { data: null, error: 'Failed to check module completion.' }
    const totalCount = Number(moduleTotals.data.total)
    const completedCount = Number(moduleTotals.data.completed)
    const allCompleted = moduleTotals.data.ready === true
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const challenge = moduleChallenge.data
    const challengeUnlocked = allCompleted && !!challenge

    const moduleStatus = allCompleted
      ? (challenge ? 'in_progress' : 'completed')
      : 'in_progress'

    // Persist module counters before returning an unlock state.
    const moduleProgressWrite = supabase.from('module_progress').upsert(
      {
        user_id: userId,
        module_id: moduleId,
        status: moduleStatus,
        completion_percentage: pct,
        completed_lessons: completedCount,
        total_lessons: totalCount,
        completed_at: allCompleted && !challenge ? now : null,
      },
      { onConflict: 'user_id,module_id', ignoreDuplicates: false }
    )

    const { error: moduleError } = await moduleProgressWrite
    if (moduleError) return { data: null, error: 'Failed to update module progress.' }
    await syncLearningPathProgress(userId, lesson.learning_path_id, supabase)

    return {
      data: { moduleCompleted: allCompleted && !challenge, challengeUnlocked },
      error: null,
    }
  } catch (err) {
    console.error('completeLessonAndSync error:', err)
    return { data: null, error: 'Failed to complete lesson.' }
  }
}

/**
 * Called when admin approves a challenge attempt with is_passed=true.
 * Marks the module as completed and unlocks the next module.
 */
export async function completeChallengeAndUnlockNext(
  userId: string,
  challengeId: string,
  earnedXp: number
): Promise<Result<{ nextModuleId: string | null }>> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // 1. Get challenge → module → path
    const { data: challenge } = await supabase
      .from('challenges')
      .select('module_id')
      .eq('id', challengeId)
      .single()

    if (!challenge?.module_id) {
      return { data: { nextModuleId: null }, error: null }
    }

    const { data: mod } = await supabase
      .from('learning_modules')
      .select('id, learning_path_id, sort_order')
      .eq('id', challenge.module_id)
      .single()

    if (!mod) return { data: { nextModuleId: null }, error: null }

    // 2. Mark module as completed
    const { error: progressError } = await supabase.from('module_progress').upsert(
      {
        user_id: userId,
        module_id: mod.id,
        status: 'completed',
        completion_percentage: 100,
        completed_at: now,
      },
      { onConflict: 'user_id,module_id', ignoreDuplicates: false }
    )
    if (progressError) return { data: null, error: 'Failed to update module progress.' }

    // 3. Find and unlock next module
    const { data: nextModule } = await supabase
      .from('learning_modules')
      .select('id')
      .eq('learning_path_id', mod.learning_path_id)
      .eq('is_published', true)
      .gt('sort_order', mod.sort_order)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextModule) {
      const { error: nextError } = await supabase.from('module_progress').upsert(
        {
          user_id: userId,
          module_id: nextModule.id,
          status: 'available',
          completion_percentage: 0,
          completed_lessons: 0,
        },
        { onConflict: 'user_id,module_id', ignoreDuplicates: true }
      )
      if (nextError) return { data: null, error: 'Failed to unlock the next module.' }
    }

    // Reward totals are updated atomically by the review RPC, never by progress counters.

    // 5. Sync path progress
    await syncLearningPathProgress(userId, mod.learning_path_id)

    return { data: { nextModuleId: nextModule?.id ?? null }, error: null }
  } catch (err) {
    console.error('completeChallengeAndUnlockNext error:', err)
    return { data: null, error: 'Failed to complete challenge.' }
  }
}

/**
 * Sync learning_path_progress counters for a user and path.
 * Should be called after any lesson/module/challenge status change.
 */
export async function syncLearningPathProgress(
  userId: string,
  pathId: string,
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  try {
    const supabase = client ?? await createClient()
    const now = new Date().toISOString()

    // Empty inner embeds scope the child rows to the same published modules
    // that were previously read into ID lists. Counts and pointers can now be
    // requested together, without shipping completed lesson rows.
    const [modules, moduleDone, lessonDone, passed, currentModule, currentLesson] = await Promise.all([
      supabase.from('learning_modules').select('id', { count: 'exact', head: true })
        .eq('learning_path_id', pathId).eq('is_published', true),
      supabase.from('module_progress').select('module_id,learning_modules!inner()', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'completed')
        .eq('learning_modules.learning_path_id', pathId).eq('learning_modules.is_published', true),
      supabase.from('lesson_progress').select('lesson_id,lessons!inner(learning_modules!inner())', { count: 'exact', head: true })
        .eq('user_id', userId).eq('status', 'completed')
        .eq('lessons.learning_modules.learning_path_id', pathId).eq('lessons.learning_modules.is_published', true),
      supabase.from('challenge_attempts').select('challenge_id,challenges!inner(learning_modules!inner())')
        .eq('user_id', userId).eq('is_passed', true)
        .eq('challenges.learning_modules.learning_path_id', pathId).eq('challenges.learning_modules.is_published', true),
      supabase.from('module_progress').select('module_id,learning_modules!inner()')
        .eq('user_id', userId).in('status', ['available', 'in_progress'])
        .eq('learning_modules.learning_path_id', pathId).eq('learning_modules.is_published', true)
        .limit(1).maybeSingle(),
      supabase.from('lesson_progress').select('lesson_id,lessons!inner(learning_modules!inner())')
        .eq('user_id', userId).eq('status', 'in_progress')
        .eq('lessons.learning_modules.learning_path_id', pathId).eq('lessons.learning_modules.is_published', true)
        .limit(1).maybeSingle(),
    ])
    for (const result of [modules, moduleDone, lessonDone, passed, currentModule, currentLesson]) {
      if (result.error) throw result.error
    }
    const totalModules = modules.count ?? 0
    const completedModules = moduleDone.count ?? 0
    const completedLessons = lessonDone.count ?? 0
    const completedChallenges = new Set((passed.data ?? []).map(attempt => attempt.challenge_id)).size
    const pct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
    const currentModuleId = currentModule.data?.module_id ?? null

    const { error: pathError } = await supabase.from('learning_path_progress').upsert(
      {
        user_id: userId,
        learning_path_id: pathId,
        completion_percentage: pct,
        completed_modules: completedModules,
        completed_lessons: completedLessons,
        completed_challenges: completedChallenges,
        current_module_id: currentModuleId,
        current_lesson_id: currentModuleId ? currentLesson.data?.lesson_id ?? null : null,
        last_activity_at: now,
      },
      { onConflict: 'user_id,learning_path_id', ignoreDuplicates: false }
    )
    if (pathError) throw pathError
  } catch (err) {
    console.error('syncLearningPathProgress error:', err)
    throw err
  }
}

/**
 * Get module unlock status for a user.
 *
 * Rule:
 *   - Module 1 (sort_order <= 1): always available.
 *   - Module N: unlocked only when the previous module is FULLY completed:
 *       all published lessons completed + challenge passed (or no challenge).
 */
export async function getModuleAccessStatus(
  userId: string,
  moduleId: string
): Promise<'locked' | 'available' | 'in_progress' | 'completed'> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) return 'locked'
    const { data: allowed, error } = await supabase.rpc('curriculum_can_read_module', { p_module: moduleId })
    if (error || !allowed) return 'locked'
    const { data: progress } = await supabase.from('module_progress').select('status')
      .eq('user_id', userId).eq('module_id', moduleId).maybeSingle()
    return progress?.status === 'completed' ? 'completed'
      : progress?.status === 'in_progress' ? 'in_progress' : 'available'
  } catch { return 'locked' }
}
