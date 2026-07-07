'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Sword, Loader2 } from 'lucide-react'
import { markLessonCompleted } from '@/lib/academy/progress'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface LessonActionsProps {
  lessonId: string
  userId: string
  isCompleted: boolean
  relatedChallengeId: string | null
  nextLessonId: string | null
  dictionary: Dictionary
  locale: Locale
}

export function LessonActions({
  lessonId,
  userId,
  isCompleted,
  relatedChallengeId,
  nextLessonId,
  dictionary,
  locale,
}: LessonActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(isCompleted)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleMarkComplete = () => {
    startTransition(async () => {
      const result = await markLessonCompleted(userId, lessonId)
      if (result.data) {
        setCompleted(true)
        setSuccessMsg(dictionary.learning.lessonCompleted)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400" role="status">
          {successMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Mark as Complete */}
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

        {/* Related Challenge */}
        {relatedChallengeId && (
          <Link
            href={`/${locale}/academy/challenges/${relatedChallengeId}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
          >
            <Sword className="h-4 w-4" aria-hidden="true" />
            {dictionary.learning.startChallenge}
          </Link>
        )}

        {/* Next Lesson */}
        {nextLessonId && completed && (
          <Link
            href={`/${locale}/academy/lessons/${nextLessonId}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-secondary/40 px-5 py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary/60"
          >
            {dictionary.learning.nextLesson}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* Practice section */}
      {relatedChallengeId && (
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
          <p className="text-sm font-medium text-foreground mb-1">{dictionary.learning.practiceWhatYouLearned}</p>
          <p className="text-xs text-muted-foreground">
            {dictionary.learning.noRelatedChallenge.includes('لا') ? '' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
