import Link from 'next/link'
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LearningOverview } from '@/lib/academy/progress'

interface ContinueLearningCardProps {
  overview: LearningOverview
  dictionary: Dictionary
  locale: Locale
}

export function ContinueLearningCard({ overview, dictionary, locale }: ContinueLearningCardProps) {
  if (overview.totalCount === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/60 to-primary/10 p-6 backdrop-blur-sm">
      {/* Background glow */}
      <div className="absolute -end-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative space-y-4">
        {/* Header */}
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

        {/* Progress Bar */}
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

        {/* Next Lesson */}
        {overview.nextLessonId && overview.nextLessonTitle && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/40 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <BookOpen className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{dictionary.learning.nextLesson}</p>
                <p className="text-sm font-medium text-foreground truncate">{overview.nextLessonTitle}</p>
              </div>
            </div>
            <Link
              href={`/${locale}/academy/lessons/${overview.nextLessonId}`}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              {dictionary.learning.continueLearning}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* All completed */}
        {!overview.nextLessonId && overview.completedCount === overview.totalCount && overview.totalCount > 0 && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-400">🎉 {dictionary.learning.completed}!</p>
          </div>
        )}
      </div>
    </div>
  )
}
