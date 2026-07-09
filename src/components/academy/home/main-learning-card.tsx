import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LearningOverview } from '@/lib/academy/learning'

interface MainLearningCardProps {
  overview: LearningOverview
  dictionary: Dictionary
  locale: Locale
}

export function MainLearningCard({ overview, dictionary, locale }: MainLearningCardProps) {
  const home = dictionary.academy.home
  const actionHref = overview.nextActionHref ? `/${locale}${overview.nextActionHref}` : null
  const actionLabel = overview.completedCount === 0 ? home.startLearning : home.continueLearning

  return (
    <Card className="overflow-hidden border-primary/20 bg-card/75 shadow-sm backdrop-blur-xl">
      <CardContent className="p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">{home.currentPath}</p>
                <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">
                  {overview.currentPathTitle ?? dictionary.academy.title}
                </h2>
              </div>
            </div>

            {overview.currentPathDescription && (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {overview.currentPathDescription}
              </p>
            )}

            {overview.nextLessonTitle && (
              <div className="rounded-lg border border-border/60 bg-background/50 p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {home.nextLesson}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {overview.nextLessonTitle}
                    </p>
                    {overview.nextLessonSummary && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {overview.nextLessonSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-background/50 p-5">
              <div className="flex items-end justify-between gap-4">
                <span className="text-4xl font-bold text-foreground">{overview.progressPercent}%</span>
                <span className="pb-1 text-sm text-muted-foreground">
                  {overview.completedCount} / {overview.totalCount}
                </span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-cyber-gradient transition-all"
                  style={{ width: `${overview.progressPercent}%` }}
                />
              </div>
            </div>

            {actionHref && (
              <Button asChild variant="gradient" className="w-full">
                <Link href={actionHref}>
                  {actionLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
