import Link from 'next/link'
import { BookOpen, ArrowRight, Sparkles, Sword } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LearningOverview } from '@/lib/academy/learning'

interface ContinueLearningCardProps {
  overview: LearningOverview
  dictionary: Dictionary
  locale: Locale
}

export function ContinueLearningCard({ overview, dictionary, locale }: ContinueLearningCardProps) {
  if (overview.totalCount === 0) {
    return null
  }

  const nextHref = overview.nextActionHref ? `/${locale}${overview.nextActionHref}` : null
  const nextLabel =
    overview.nextActionKind === 'challenge'
      ? dictionary.learning.startChallenge
      : overview.completedCount === 0
        ? dictionary.learning.startLearning
        : dictionary.learning.continueLearning
  const NextIcon = overview.nextActionKind === 'challenge' ? Sword : ArrowRight

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/60 to-primary/10 p-6 backdrop-blur-sm">
      <div className="absolute -end-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{dictionary.learning.continueLearning}</h2>
            {overview.currentPathTitle && (
              <p className="text-xs text-muted-foreground">{overview.currentPathTitle}</p>
            )}
          </div>
        </div>

        {overview.currentPathDescription && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {overview.currentPathDescription}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {overview.completedCount} / {overview.totalCount} {dictionary.learning.lessonsCompleted}
            </span>
            <span className="font-semibold text-primary">{overview.progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${overview.progressPercent}%` }}
            />
          </div>
        </div>

        {overview.nextLessonId && overview.nextLessonTitle && nextHref && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/40 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{dictionary.learning.nextLesson}</p>
                <p className="truncate text-sm font-medium text-foreground">{overview.nextLessonTitle}</p>
                {overview.nextLessonSummary && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {overview.nextLessonSummary}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={nextHref}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              {nextLabel}
              <NextIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {!overview.nextLessonId && overview.completedCount === overview.totalCount && overview.totalCount > 0 && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-400">{dictionary.learning.completed}</p>
          </div>
        )}
      </div>
    </div>
  )
}
