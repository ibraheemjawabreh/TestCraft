'use server'

import { requireAdmin } from '@/lib/auth/require-admin'
import { getAdminAttemptReview, saveAdminAttemptReview, startAttemptReview, type SaveReviewInput } from '@/lib/admin/attempt-review'
import type { Locale } from '@/i18n/config'

export async function fetchAttemptDetails(locale: Locale, challengeId: string, attemptId: string) {
  try {
    await requireAdmin(locale)
    const result = await getAdminAttemptReview(challengeId, attemptId)
    return result
  } catch (error: any) {
    return { data: null, error: error?.message || 'Failed to fetch details' }
  }
}

export async function submitQuickReview(locale: Locale, input: SaveReviewInput) {
  try {
    await requireAdmin(locale)
    const result = await saveAdminAttemptReview(input)
    return result
  } catch (error: any) {
    return { data: null, error: error?.message || 'Failed to save review' }
  }
}

export async function markAttemptUnderReview(locale: Locale, attemptId: string, challengeId: string) {
  try {
    await requireAdmin(locale)
    const result = await startAttemptReview(attemptId, challengeId)
    return result
  } catch (error: any) {
    return { data: null, error: error?.message || 'Failed to start review' }
  }
}
