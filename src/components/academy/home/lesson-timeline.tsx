import Link from 'next/link'
import { CheckCircle2, Circle, Lock, Timer } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LessonProgressItem } from '@/lib/academy/learning'

interface LessonTimelineProps {
  lessons: LessonProgressItem[]
  dictionary: Dictionary
  locale: Locale
}

export function LessonTimeline({ lessons, dictionary, locale }: LessonTimelineProps) {
  const home = dictionary.academy.home

  if (lessons.length === 0) {
    return null
  }

  return (
    <Card className="border-border/60 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{home.lessonTimeline}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {lessons.map((lesson, index) => {
          const isCompleted = lesson.status === 'completed'
          const isCurrent = lesson.status === 'current'
          const isLocked = !lesson.is_unlocked
          const StatusIcon = isCompleted ? CheckCircle2 : isCurrent ? Circle : Lock
          const statusLabel = isCompleted ? home.completed : isCurrent ? home.current : home.locked

          return (
            <div key={lesson.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4">
              <div className="flex flex-col items-center">
                <StatusIcon
                  className={cn(
                    'h-6 w-6 shrink-0',
                    isCompleted && 'text-green-500',
                    isCurrent && 'fill-primary/20 text-primary',
                    isLocked && 'text-muted-foreground/45',
                  )}
                  aria-hidden="true"
                />
                {index < lessons.length - 1 && (
                  <div className={cn('min-h-10 w-px flex-1', isCompleted ? 'bg-green-500/30' : 'bg-border')} />
                )}
              </div>

              <div className="pb-5">
                <div
                  className={cn(
                    'rounded-lg border p-4',
                    isCompleted && 'border-green-500/25 bg-green-500/5',
                    isCurrent && 'border-primary/25 bg-primary/5',
                    isLocked && 'border-border/50 bg-secondary/20 opacity-75',
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{lesson.title}</h3>
                        <Badge variant="outline" className="border-border/70 bg-background/50">
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                        {lesson.estimated_minutes} {dictionary.learning.minutes}
                      </p>
                    </div>

                    {lesson.is_unlocked ? (
                      <Button asChild variant={isCurrent ? 'default' : 'outline'} size="sm">
                        <Link href={`/${locale}/academy/lessons/${lesson.id}`}>{home.openLesson}</Link>
                      </Button>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">{home.lockedLesson}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
