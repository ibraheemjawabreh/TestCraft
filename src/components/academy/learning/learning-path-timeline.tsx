import Link from 'next/link'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LessonProgressItem } from '@/lib/academy/progress'

interface LearningPathTimelineProps {
  lessons: LessonProgressItem[]
  dictionary: Dictionary
  locale: Locale
}

export function LearningPathTimeline({ lessons, dictionary, locale }: LearningPathTimelineProps) {
  if (lessons.length === 0) {
    return null
  }

  // Find the first uncompleted lesson to mark as "current"
  const currentIndex = lessons.findIndex((l) => !l.is_completed)

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {dictionary.learning.pathProgress}
      </h2>

      <div className="space-y-0">
        {lessons.map((lesson, index) => {
          const isCurrent = index === currentIndex
          const isUpcoming = currentIndex !== -1 && index > currentIndex

          return (
            <div key={lesson.id} className="flex gap-4 group">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                {lesson.is_completed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" aria-hidden="true" />
                ) : isCurrent ? (
                  <Circle className="h-6 w-6 text-primary fill-primary/20 shrink-0" aria-hidden="true" />
                ) : (
                  <Lock className="h-6 w-6 text-muted-foreground/40 shrink-0" aria-hidden="true" />
                )}
                {index < lessons.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[2rem] ${lesson.is_completed ? 'bg-green-400/30' : 'bg-border/40'}`} />
                )}
              </div>

              {/* Lesson Card */}
              <Link
                href={isUpcoming ? '#' : `/${locale}/academy/lessons/${lesson.id}`}
                className={`flex-1 mb-3 rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                    : lesson.is_completed
                    ? 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
                    : 'border-border/30 bg-card/20 opacity-60 cursor-default'
                }`}
                onClick={(e) => isUpcoming && e.preventDefault()}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lesson.estimated_minutes} {dictionary.learning.minutes} · {lesson.difficulty}
                    </p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                    lesson.is_completed
                      ? 'text-green-400 bg-green-500/10'
                      : isCurrent
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground bg-secondary/30'
                  }`}>
                    {lesson.is_completed ? dictionary.learning.completed : isCurrent ? dictionary.learning.current : dictionary.learning.upcoming}
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
