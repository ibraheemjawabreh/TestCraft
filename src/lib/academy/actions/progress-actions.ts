'use server'
import { apiUser } from '@/lib/auth/api-auth'

import { revalidatePath } from 'next/cache'
import { completeLessonAndSync, markLessonInProgress } from '@/lib/academy/services/ProgressService'
import type { Locale } from '@/i18n/config'

export async function actionMarkLessonInProgress(userId: string, lessonId: string) {
  const { user } = await apiUser()
  return markLessonInProgress(user.id, lessonId)
}

export async function actionCompleteLesson(
  userId: string,
  lessonId: string,
  locale: Locale
) {
  const { user } = await apiUser()
  const result = await completeLessonAndSync(user.id, lessonId)
  // Only revalidate this lesson page — not the entire academy tree
  revalidatePath(`/${locale}/academy/lessons/${lessonId}`)
  return result
}

