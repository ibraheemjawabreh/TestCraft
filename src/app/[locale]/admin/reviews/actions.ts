'use server'

import { requireAdmin } from '@/lib/auth/require-admin'
import { getAdminAttemptReview, saveAdminAttemptReview, type SaveReviewInput } from '@/lib/admin/attempt-review'
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
