'use server'
import { revalidatePath } from 'next/cache'
import { completeLessonAndSync } from '@/lib/academy/services/ProgressService'
import type { Locale } from '@/i18n/config'

export async function actionCompleteLesson(
  userId: string,
  lessonId: string,
  locale: Locale
) {
  // The service verifies userId against the authenticated session before any write.
  const result = await completeLessonAndSync(userId, lessonId)
  if (!result.error) revalidatePath(`/${locale}/academy/lessons/${lessonId}`)
  return result
}

