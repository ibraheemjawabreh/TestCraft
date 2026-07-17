import 'server-only'
import { createClient } from '@/lib/supabase/server'

interface Result<T> {
  data: T | null
  error: string | null
}

/**
 * Mark a lesson as opened (in_progress). Idempotent.
 * Called automatically when a tester opens a lesson page.
 */
export async function markLessonInProgress(
  userId: string,
  lessonId: string
): Promise<Result<boolean>> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

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
        ignoreDuplicates: false,
      }
    )

    if (error) {
      // If row already exists and status is completed, just update last_opened_at
      await supabase
        .from('lesson_progress')
        .update({ last_opened_at: now })
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
    }

    return { data: true, error: null }
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

    // 1. Mark lesson as completed
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

    // 2. Find which module this lesson belongs to
    const { data: lesson } = await supabase
      .from('lessons')
      .select('module_id, learning_path_id')
      .eq('id', lessonId)
      .single()

    if (!lesson?.module_id) {
      return { data: { moduleCompleted: false, challengeUnlocked: false }, error: null }
    }

    // 3. Get all lessons in this module
    const { data: moduleLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('module_id', lesson.module_id)
      .eq('is_published', true)

    if (!moduleLessons || moduleLessons.length === 0) {
      return { data: { moduleCompleted: false, challengeUnlocked: false }, error: null }
    }

    // 4. Get completed lessons for this module
    const lessonIds = moduleLessons.map(l => l.id)
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)
      .eq('status', 'completed')

    const completedCount = completedLessons?.length ?? 0
    const totalCount = lessonIds.length
    const allCompleted = completedCount === totalCount
    const pct = Math.round((completedCount / totalCount) * 100)

    // 5. Check if this module has a challenge
    const { data: moduleChallenge } = await supabase
      .from('challenges')
      .select('id')
      .eq('module_id', lesson.module_id)
      .eq('is_active', true)
      .maybeSingle()

    const challengeUnlocked = allCompleted && !!moduleChallenge

    // 6. Upsert module_progress
    const moduleStatus = allCompleted
      ? (moduleChallenge ? 'in_progress' : 'completed') // if challenge exists, needs to be done first
      : 'in_progress'

    await supabase.from('module_progress').upsert(
      {
        user_id: userId,
        module_id: lesson.module_id,
        status: moduleStatus,
        completion_percentage: pct,
        completed_lessons: completedCount,
        total_lessons: totalCount,
        completed_at: allCompleted && !moduleChallenge ? now : null,
      },
      { onConflict: 'user_id,module_id', ignoreDuplicates: false }
    )

    // 7. Update learning_path_progress
    await syncLearningPathProgress(userId, lesson.learning_path_id)

    return {
      data: { moduleCompleted: allCompleted && !moduleChallenge, challengeUnlocked },
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
    await supabase.from('module_progress').upsert(
      {
        user_id: userId,
        module_id: mod.id,
        status: 'completed',
        completion_percentage: 100,
        completed_at: now,
      },
      { onConflict: 'user_id,module_id', ignoreDuplicates: false }
    )

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
      await supabase.from('module_progress').upsert(
        {
          user_id: userId,
          module_id: nextModule.id,
          status: 'available',
          completion_percentage: 0,
          completed_lessons: 0,
        },
        { onConflict: 'user_id,module_id', ignoreDuplicates: true }
      )
    }

    // 4. Award XP to user profile
    if (earnedXp > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', userId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({ total_xp: (profile.total_xp ?? 0) + earnedXp })
          .eq('id', userId)
      }
    }

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
  pathId: string
): Promise<void> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const [modulesRes, modProgressRes, lessonProgressRes, challengeRes] = await Promise.all([
      supabase.from('learning_modules').select('id').eq('learning_path_id', pathId).eq('is_published', true),
      supabase.from('module_progress').select('module_id, status').eq('user_id', userId),
      supabase.from('lesson_progress').select('lesson_id, status').eq('user_id', userId),
      supabase.from('challenge_attempts')
        .select('challenge_id, is_passed')
        .eq('user_id', userId)
        .eq('is_passed', true),
    ])

    const allModuleIds = new Set((modulesRes.data ?? []).map(m => m.id))
    const modProgressMap = new Map((modProgressRes.data ?? []).map(mp => [mp.module_id, mp.status]))

    const completedModules = Array.from(allModuleIds).filter(id => modProgressMap.get(id) === 'completed').length
    const totalModules = allModuleIds.size

    const completedLessons = (lessonProgressRes.data ?? []).filter(lp => lp.status === 'completed').length
    const completedChallenges = (challengeRes.data ?? []).filter(ca => ca.is_passed).length

    const pct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

    // Get current pointers for navigation
    const { data: inProgressModProgress } = await supabase
      .from('module_progress')
      .select('module_id')
      .eq('user_id', userId)
      .in('status', ['available', 'in_progress'])
      .limit(1)
      .maybeSingle()

    let currentLessonId: string | null = null
    if (inProgressModProgress?.module_id) {
      const { data: currentLesson } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('status', ['in_progress'])
        .maybeSingle()
      currentLessonId = currentLesson?.lesson_id ?? null
    }

    await supabase.from('learning_path_progress').upsert(
      {
        user_id: userId,
        learning_path_id: pathId,
        completion_percentage: pct,
        completed_modules: completedModules,
        completed_lessons: completedLessons,
        completed_challenges: completedChallenges,
        current_module_id: inProgressModProgress?.module_id ?? null,
        current_lesson_id: currentLessonId,
        last_activity_at: now,
      },
      { onConflict: 'user_id,learning_path_id', ignoreDuplicates: false }
    )
  } catch (err) {
    console.error('syncLearningPathProgress error:', err)
  }
}

/**
 * Get module unlock status for a user (used for lock/unlock gate checks).
 */
export async function getModuleAccessStatus(
  userId: string,
  moduleId: string
): Promise<'locked' | 'available' | 'in_progress' | 'completed'> {
  try {
    const supabase = await createClient()

    // Get the module's sort_order and path
    const { data: mod } = await supabase
      .from('learning_modules')
      .select('sort_order, learning_path_id')
      .eq('id', moduleId)
      .single()

    if (!mod) return 'locked'

    // First module is always available
    if (mod.sort_order <= 1) {
      const { data: mp } = await supabase
        .from('module_progress')
        .select('status')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle()
      return (mp?.status as any) ?? 'available'
    }

    // For subsequent modules, check if previous module is completed
    const { data: prevMod } = await supabase
      .from('learning_modules')
      .select('id')
      .eq('learning_path_id', mod.learning_path_id)
      .eq('is_published', true)
      .lt('sort_order', mod.sort_order)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!prevMod) return 'available'

    const { data: prevProgress } = await supabase
      .from('module_progress')
      .select('status')
      .eq('user_id', userId)
      .eq('module_id', prevMod.id)
      .maybeSingle()

    if (prevProgress?.status !== 'completed') return 'locked'

    const { data: mp } = await supabase
      .from('module_progress')
      .select('status')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle()

    return (mp?.status as any) ?? 'available'
  } catch {
    return 'locked'
  }
}
