/**
 * TestCraft Gamification Engine
 *
 * Central source of truth for:
 *  - XP calculation helpers (level math, rank, progress)
 *  - XP transaction awarding (lesson, challenge, badges)
 *
 * All award functions are idempotent — calling them more than once
 * for the same event is safe and will not double-award XP.
 */
import 'server-only'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface LevelProgress {
  currentLevel: number
  currentLevelMinXp: number
  nextLevel: number
  nextLevelRequiredXp: number
  xpIntoCurrentLevel: number
  xpNeededForNextLevel: number
  levelProgressPercentage: number
}

export interface RankInfo {
  key: string
  labelEn: string
  labelAr: string
}

export interface XpAwardResult {
  awarded: boolean
  totalXpAwarded: number
  newTotalXp: number
  newLevel: number
  previousLevel: number
  leveledUp: boolean
  newBadges: string[]
}

export interface BugReviewInput {
  reportId: string
  classification: 'valid_bug' | 'duplicate' | 'not_a_bug' | 'needs_improvement'
  matchedHiddenBugId?: string | null
}

// ─────────────────────────────────────────────────────────────
// Level Formula: XP required = 75 × level × (level - 1)
// ─────────────────────────────────────────────────────────────

export function getRequiredXpForLevel(level: number): number {
  if (level <= 1) return 0
  return 75 * level * (level - 1)
}

export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  let level = 1
  while (getRequiredXpForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const currentLevel = getLevelFromXp(totalXp)
  const nextLevel = currentLevel + 1
  const currentLevelMinXp = getRequiredXpForLevel(currentLevel)
  const nextLevelRequiredXp = getRequiredXpForLevel(nextLevel)
  const xpIntoCurrentLevel = totalXp - currentLevelMinXp
  const xpSpanForLevel = nextLevelRequiredXp - currentLevelMinXp
  const levelProgressPercentage =
    xpSpanForLevel > 0 ? Math.min(Math.round((xpIntoCurrentLevel / xpSpanForLevel) * 100), 100) : 100

  return {
    currentLevel,
    currentLevelMinXp,
    nextLevel,
    nextLevelRequiredXp,
    xpIntoCurrentLevel,
    xpNeededForNextLevel: Math.max(0, nextLevelRequiredXp - totalXp),
    levelProgressPercentage,
  }
}

// ─────────────────────────────────────────────────────────────
// Rank System
// ─────────────────────────────────────────────────────────────

const RANKS: Array<{ minLevel: number; key: string; labelEn: string; labelAr: string }> = [
  { minLevel: 21, key: 'qa_champion',          labelEn: 'QA Champion',          labelAr: 'بطل ضمان الجودة'           },
  { minLevel: 15, key: 'test_specialist',       labelEn: 'Test Specialist',       labelAr: 'مختص اختبار'              },
  { minLevel: 10, key: 'qa_analyst',            labelEn: 'QA Analyst',            labelAr: 'محلل ضمان الجودة'          },
  { minLevel: 6,  key: 'test_case_builder',     labelEn: 'Test Case Builder',     labelAr: 'كاتب حالات اختبار'         },
  { minLevel: 3,  key: 'bug_hunter',            labelEn: 'Bug Hunter',            labelAr: 'صائد أخطاء'               },
  { minLevel: 1,  key: 'qa_trainee',            labelEn: 'QA Trainee',            labelAr: 'متدرب ضمان جودة'           },
]

export function getRankFromLevel(level: number): RankInfo {
  for (const rank of RANKS) {
    if (level >= rank.minLevel) {
      return { key: rank.key, labelEn: rank.labelEn, labelAr: rank.labelAr }
    }
  }
  return { key: 'qa_trainee', labelEn: 'QA Trainee', labelAr: 'متدرب ضمان جودة' }
}

// ─────────────────────────────────────────────────────────────
// XP Preview (no DB writes — pure calculation for Admin UI)
// ─────────────────────────────────────────────────────────────

export interface XpPreview {
  baseXp: number
  bugBonusXp: number
  isPerfect: boolean
  perfectBonus: number
  totalXp: number
  matchedBugIds: string[]
}

export function calculateChallengeXpPreview(
  baseXp: number,
  validMatchedBugBonuses: number[],
  totalHiddenBugCount: number,
): XpPreview {
  const uniqueMatched = [...new Set(validMatchedBugBonuses)]
  const bugBonusXp = uniqueMatched.reduce((sum, bonus) => sum + bonus, 0)
  const isPerfect =
    totalHiddenBugCount > 0 && uniqueMatched.length >= totalHiddenBugCount
  const perfectBonus = isPerfect ? 25 : 0
  const totalXp = baseXp + bugBonusXp + perfectBonus

  return {
    baseXp,
    bugBonusXp,
    isPerfect,
    perfectBonus,
    totalXp,
    matchedBugIds: [],
  }
}

// ─────────────────────────────────────────────────────────────
// Core: update profile XP + level atomically
// ─────────────────────────────────────────────────────────────

async function addXpToProfile(
  userId: string,
  amount: number,
): Promise<{ newTotalXp: number; newLevel: number; previousLevel: number }> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, current_level')
    .eq('id', userId)
    .single()

  const previousTotalXp = profile?.total_xp ?? 0
  const previousLevel = profile?.current_level ?? getLevelFromXp(previousTotalXp)
  const newTotalXp = previousTotalXp + amount
  const newLevel = getLevelFromXp(newTotalXp)

  await supabase
    .from('profiles')
    .update({ total_xp: newTotalXp, current_level: newLevel })
    .eq('id', userId)

  return { newTotalXp, newLevel, previousLevel }
}

// ─────────────────────────────────────────────────────────────
// Badge awarding (idempotent via DB unique constraint)
// ─────────────────────────────────────────────────────────────

const LESSON_XP = 10
const PERFECT_BONUS_XP = 25

type BadgeKey =
  | 'first_lesson_completed'
  | 'first_bug_report'
  | 'first_approved_challenge'
  | 'perfect_bug_hunt'
  | 'three_challenges_completed'
  | 'ten_valid_bug_reports'

async function awardBadgeIfEarned(
  userId: string,
  badgeKey: BadgeKey,
): Promise<boolean> {
  const supabase = await createClient()

  const { data: badge } = await supabase
    .from('badges')
    .select('id')
    .eq('badge_key', badgeKey)
    .maybeSingle()

  if (!badge) return false

  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .eq('badge_id', badge.id)
    .maybeSingle()

  if (existing) return false // already earned

  const { error } = await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_id: badge.id, earned_at: new Date().toISOString() })

  return !error
}

async function checkAndAwardBadges(
  userId: string,
  events: {
    lessonCompleted?: boolean
    bugReportSubmitted?: boolean
    challengeApproved?: boolean
    isPerfect?: boolean
  },
): Promise<BadgeKey[]> {
  const supabase = await createClient()
  const earned: BadgeKey[] = []

  if (events.lessonCompleted) {
    const { count } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null)

    if ((count ?? 0) === 1) {
      const ok = await awardBadgeIfEarned(userId, 'first_lesson_completed')
      if (ok) earned.push('first_lesson_completed')
    }
  }

  if (events.bugReportSubmitted) {
    const { count } = await supabase
      .from('bug_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) === 1) {
      const ok = await awardBadgeIfEarned(userId, 'first_bug_report')
      if (ok) earned.push('first_bug_report')
    }
  }

  if (events.challengeApproved) {
    const { count } = await supabase
      .from('challenge_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved')

    if ((count ?? 0) === 1) {
      const ok = await awardBadgeIfEarned(userId, 'first_approved_challenge')
      if (ok) earned.push('first_approved_challenge')
    }

    if ((count ?? 0) >= 3) {
      const ok = await awardBadgeIfEarned(userId, 'three_challenges_completed')
      if (ok) earned.push('three_challenges_completed')
    }

    // Check valid bug reports
    const { count: validCount } = await supabase
      .from('bug_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('admin_classification', 'valid_bug')

    if ((validCount ?? 0) >= 10) {
      const ok = await awardBadgeIfEarned(userId, 'ten_valid_bug_reports')
      if (ok) earned.push('ten_valid_bug_reports')
    }
  }

  if (events.isPerfect) {
    const ok = await awardBadgeIfEarned(userId, 'perfect_bug_hunt')
    if (ok) earned.push('perfect_bug_hunt')
  }

  return earned
}

// ─────────────────────────────────────────────────────────────
// Public: Award lesson XP (idempotent)
// ─────────────────────────────────────────────────────────────

export async function awardLessonXp(
  userId: string,
  lessonId: string,
): Promise<XpAwardResult> {
  const supabase = await createClient()

  // Try to insert the XP transaction (unique index prevents duplicates)
  const { error: txError } = await supabase.from('xp_transactions').insert({
    user_id: userId,
    source_type: 'lesson',
    source_id: lessonId,
    amount: LESSON_XP,
    reason: 'lesson_completed',
    metadata: {},
  })

  if (txError) {
    // Unique constraint violation = already awarded — not an error
    if (txError.code === '23505') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_xp, current_level')
        .eq('id', userId)
        .single()
      return {
        awarded: false,
        totalXpAwarded: 0,
        newTotalXp: profile?.total_xp ?? 0,
        newLevel: profile?.current_level ?? 1,
        previousLevel: profile?.current_level ?? 1,
        leveledUp: false,
        newBadges: [],
      }
    }
    console.error('awardLessonXp transaction error:', txError)
    throw new Error('Failed to create XP transaction')
  }

  const { newTotalXp, newLevel, previousLevel } = await addXpToProfile(userId, LESSON_XP)

  // Check badges after awarding
  const newBadges = await checkAndAwardBadges(userId, { lessonCompleted: true })

  return {
    awarded: true,
    totalXpAwarded: LESSON_XP,
    newTotalXp,
    newLevel,
    previousLevel,
    leveledUp: newLevel > previousLevel,
    newBadges,
  }
}

// ─────────────────────────────────────────────────────────────
// Public: Award challenge XP (idempotent)
// Called from admin review after approval.
// ─────────────────────────────────────────────────────────────

export async function awardChallengeXp(
  userId: string,
  attemptId: string,
  challengeId: string,
  baseXp: number,
  foundHiddenBugIds: string[],
): Promise<XpAwardResult> {
  const supabase = await createClient()

  // Guard: check xp_awarded flag on attempt
  const { data: attempt } = await supabase
    .from('challenge_attempts')
    .select('xp_awarded, awarded_xp')
    .eq('id', attemptId)
    .single()

  if (attempt?.xp_awarded) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp, current_level')
      .eq('id', userId)
      .single()
    return {
      awarded: false,
      totalXpAwarded: 0,
      newTotalXp: profile?.total_xp ?? 0,
      newLevel: profile?.current_level ?? 1,
      previousLevel: profile?.current_level ?? 1,
      leveledUp: false,
      newBadges: [],
    }
  }

  // Fetch all active hidden bugs for this challenge for perfect bonus calculation
  const { data: allHiddenBugs } = await supabase
    .from('hidden_bugs')
    .select('id, bonus_xp')
    .eq('challenge_id', challengeId)
    .eq('is_active', true)

  const totalHiddenBugCount = allHiddenBugs?.length ?? 0

  // Compute bug bonuses
  const matchedHiddenBugIds = new Set<string>()
  let bugBonusXp = 0

  for (const hiddenBugId of foundHiddenBugIds) {
    if (!matchedHiddenBugIds.has(hiddenBugId)) {
      matchedHiddenBugIds.add(hiddenBugId)
      const matchedBug = allHiddenBugs?.find((b) => b.id === hiddenBugId)
      bugBonusXp += matchedBug?.bonus_xp ?? 0
    }
  }

  const isPerfect = totalHiddenBugCount > 0 && matchedHiddenBugIds.size >= totalHiddenBugCount
  const perfectBonus = isPerfect ? PERFECT_BONUS_XP : 0
  const totalXpToAward = baseXp + bugBonusXp + perfectBonus

  // Insert base XP transaction (idempotent via unique index)
  const { error: baseTxError } = await supabase.from('xp_transactions').insert({
    user_id: userId,
    source_type: 'challenge_attempt',
    source_id: attemptId,
    amount: baseXp,
    reason: 'challenge_approved',
    metadata: { challengeId, baseXp },
  })

  if (baseTxError && baseTxError.code !== '23505') {
    console.error('awardChallengeXp base transaction error:', baseTxError)
    throw new Error('Failed to create base XP transaction')
  }

  if (baseTxError?.code === '23505') {
    // Already awarded
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp, current_level')
      .eq('id', userId)
      .single()
    return {
      awarded: false,
      totalXpAwarded: 0,
      newTotalXp: profile?.total_xp ?? 0,
      newLevel: profile?.current_level ?? 1,
      previousLevel: profile?.current_level ?? 1,
      leveledUp: false,
      newBadges: [],
    }
  }

  // Insert per-bug bonus transactions
  if (bugBonusXp > 0) {
    for (const hiddenBugId of Array.from(matchedHiddenBugIds)) {
      const matchedBug = allHiddenBugs?.find((b) => b.id === hiddenBugId)
      if (matchedBug && (matchedBug.bonus_xp ?? 0) > 0) {
        await supabase.from('xp_transactions').insert({
          user_id: userId,
          source_type: 'challenge_attempt',
          source_id: attemptId,
          amount: matchedBug.bonus_xp!,
          reason: 'bug_bonus',
          metadata: { hiddenBugId, challengeId },
        }).then(({ error }) => {
          if (error && error.code !== '23505') {
            console.error('bug_bonus transaction error:', error)
          }
        })
      }
    }
  }

  // Insert perfect bonus transaction
  if (isPerfect) {
    await supabase.from('xp_transactions').insert({
      user_id: userId,
      source_type: 'challenge_attempt',
      source_id: attemptId,
      amount: PERFECT_BONUS_XP,
      reason: 'perfect_challenge',
      metadata: { challengeId, matchedCount: matchedHiddenBugIds.size },
    }).then(({ error }) => {
      if (error && error.code !== '23505') {
        console.error('perfect_challenge transaction error:', error)
      }
    })
  }

  // Mark attempt as awarded
  await supabase
    .from('challenge_attempts')
    .update({
      xp_awarded: true,
      awarded_xp: totalXpToAward,
      earned_xp: totalXpToAward,
    })
    .eq('id', attemptId)

  // Update profile XP + level
  const { newTotalXp, newLevel, previousLevel } = await addXpToProfile(userId, totalXpToAward)

  // Check and award badges
  const newBadges = await checkAndAwardBadges(userId, {
    challengeApproved: true,
    isPerfect,
  })

  return {
    awarded: true,
    totalXpAwarded: totalXpToAward,
    newTotalXp,
    newLevel,
    previousLevel,
    leveledUp: newLevel > previousLevel,
    newBadges,
  }
}

// ─────────────────────────────────────────────────────────────
// Public: Notify first bug report badge trigger
// Called from bug report submission endpoint
// ─────────────────────────────────────────────────────────────

export async function onBugReportSubmitted(userId: string): Promise<void> {
  await checkAndAwardBadges(userId, { bugReportSubmitted: true })
}
