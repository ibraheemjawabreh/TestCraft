export const LESSON_OPEN_INTERVAL_MS = 5 * 60 * 1000

export function wasLessonOpenedRecently(lastOpenedAt?: string): boolean {
  return !!lastOpenedAt && Date.parse(lastOpenedAt) > Date.now() - LESSON_OPEN_INTERVAL_MS
}
