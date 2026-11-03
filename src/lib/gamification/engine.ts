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

// Reward writes and badge eligibility are atomic SQL RPCs (migration027).

export async function awardLessonXp(userId: string, lessonId: string): Promise<XpAwardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) throw new Error('Unauthorized reward request')
  const { data, error } = await supabase.rpc('curriculum_award_lesson', { p_lesson: lessonId })
  if (error) throw new Error(error.message)
  return data as XpAwardResult
}

// ─────────────────────────────────────────────────────────────
// Public: Award challenge XP (idempotent)
// Called from admin review after approval.
// ─────────────────────────────────────────────────────────────

export async function awardChallengeXp(userId: string, attemptId: string, challengeId: string, baseXp: number, foundHiddenBugIds: string[]): Promise<XpAwardResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('curriculum_award_challenge', { p_attempt: attemptId, p_found: foundHiddenBugIds })
  if (error) throw new Error(error.message)
  return data as XpAwardResult
}

// ─────────────────────────────────────────────────────────────
// Public: Notify first bug report badge trigger
// Called from bug report submission endpoint
// ─────────────────────────────────────────────────────────────

export async function onBugReportSubmitted(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('curriculum_badges', { p_user: userId })
  if (error) throw new Error(error.message)
}
