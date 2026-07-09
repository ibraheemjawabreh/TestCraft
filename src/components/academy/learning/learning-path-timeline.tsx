'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Lock, Sword } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LessonProgressItem } from '@/lib/academy/learning'

interface LearningPathTimelineProps {
  lessons: LessonProgressItem[]
  dictionary: Dictionary
  locale: Locale
}

export function LearningPathTimeline({ lessons, dictionary, locale }: LearningPathTimelineProps) {
  if (lessons.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {dictionary.learning.pathProgress}
      </h2>

      <div className="space-y-0">
        {lessons.map((lesson, index) => {
          const isCurrent = lesson.status === 'current'
          const isCompleted = lesson.status === 'completed'
          const isLocked = !lesson.is_unlocked

          return (
            <div key={lesson.id} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-green-400" aria-hidden="true" />
                ) : isCurrent ? (
                  <Circle className="h-6 w-6 shrink-0 fill-primary/20 text-primary" aria-hidden="true" />
                ) : (
                  <Lock className="h-6 w-6 shrink-0 text-muted-foreground/40" aria-hidden="true" />
                )}
                {index < lessons.length - 1 && (
                  <div className={`min-h-[2rem] w-0.5 flex-1 ${isCompleted ? 'bg-green-400/30' : 'bg-border/40'}`} />
                )}
              </div>

              <Link
                href={isLocked ? '#' : `/${locale}/academy/lessons/${lesson.id}`}
                className={`mb-3 flex-1 rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                    : isCompleted
                      ? 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
                      : 'cursor-default border-border/30 bg-card/20 opacity-60'
                }`}
                onClick={(event) => isLocked && event.preventDefault()}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{lesson.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lesson.estimated_minutes} {dictionary.learning.minutes} · {lesson.difficulty}
                    </p>
                    {lesson.related_challenge_title && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Sword className="h-3 w-3 text-primary" aria-hidden="true" />
                        {lesson.related_challenge_title}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-500/10 text-green-400'
                      : isCurrent
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/30 text-muted-foreground'
                  }`}>
                    {isCompleted ? dictionary.learning.completed : isCurrent ? dictionary.learning.current : dictionary.learning.locked}
                  </span>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
