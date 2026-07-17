'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { completeLessonAndSync, markLessonInProgress } from '@/lib/academy/services/ProgressService'
import type { Locale } from '@/i18n/config'

export async function actionMarkLessonInProgress(userId: string, lessonId: string) {
  return markLessonInProgress(userId, lessonId)
}

export async function actionCompleteLesson(
  userId: string,
  lessonId: string,
  locale: Locale
) {
  const result = await completeLessonAndSync(userId, lessonId)
  revalidatePath(`/${locale}/academy`)
  revalidatePath(`/${locale}/academy/lessons/${lessonId}`)
  return result
}
