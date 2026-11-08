'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Sword, Loader2 } from 'lucide-react'
import { actionCompleteLesson } from '@/lib/academy/actions/progress-actions'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface LessonActionsProps {
  lessonId: string
  userId: string
  isCompleted: boolean
  relatedChallengeId: string | null
  nextLessonId: string | null
  nextLessonAvailable?: boolean
  nextModule?: boolean
  pathId?: string
  dictionary: Dictionary
  locale: Locale
}

export function LessonActions({
  lessonId,
  userId,
  isCompleted,
  relatedChallengeId,
  nextLessonId,
  nextLessonAvailable = true,
  nextModule = false,
  pathId,
  dictionary,
  locale,
}: LessonActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(isCompleted)
  const [error,setError] = useState<string | null>(null)

  // Prefetch next destinations so navigation is instant
  useEffect(() => {
    if (relatedChallengeId) {
      router.prefetch(`/${locale}/academy/challenges/${relatedChallengeId}`)
    }
    if (nextLessonId) {
      router.prefetch(`/${locale}/academy/lessons/${nextLessonId}`)
    }
  }, [relatedChallengeId, nextLessonId, locale, router])

  const handleMarkComplete = () => {
    setError(null)

    startTransition(async () => {
      const result = await actionCompleteLesson(userId, lessonId, locale)
      if (result.error) { setError(dictionary.factory.failed); return }
      setCompleted(true)
      // Refresh in background so academy page is up-to-date when user navigates back
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!completed ? (
          <button
            onClick={handleMarkComplete}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            {dictionary.learning.markAsComplete}
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm font-semibold text-green-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {dictionary.learning.completed}
          </div>
        )}

        {relatedChallengeId && completed && (
          <Link
            href={`/${locale}/academy/challenges/${relatedChallengeId}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
          >
            <Sword className="h-4 w-4" aria-hidden="true" />
            {dictionary.learning.startChallenge}
          </Link>
        )}

        {nextLessonId && completed && nextLessonAvailable && (
          <Link
            href={`/${locale}/academy/lessons/${nextLessonId}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-secondary/40 px-5 py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary/60"
          >
            {nextModule ? (locale === 'ar' ? 'الوحدة التالية' : 'Next module') : dictionary.learning.nextLesson}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {completed && !nextLessonId && <Link className="inline-block text-sm text-primary hover:underline" href={`/${locale}/academy${pathId ? '?path=' + pathId : ''}`}>{locale === 'ar' ? 'العودة إلى مسار التعلم' : 'Back to learning path'}</Link>}
      {completed && nextLessonId && !nextLessonAvailable && <p className="text-sm text-muted-foreground">{locale === 'ar' ? 'أكمل متطلبات الوحدة الحالية لفتح الوحدة التالية.' : 'Complete the current module requirements to unlock the next module.'}</p>}

      {relatedChallengeId && (
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
          <p className="mb-1 text-sm font-medium text-foreground">{dictionary.learning.practiceWhatYouLearned}</p>
          <p className="text-xs text-muted-foreground">{dictionary.learning.challengeAfterLesson}</p>
        </div>
      )}
    </div>
  )
}

