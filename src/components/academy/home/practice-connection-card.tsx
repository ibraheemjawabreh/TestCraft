import Link from 'next/link'
import { Info, Sword } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LessonProgressItem } from '@/lib/academy/learning'

interface PracticeConnectionCardProps {
  lesson: LessonProgressItem | null
  dictionary: Dictionary
  locale: Locale
}

export function PracticeConnectionCard({ lesson, dictionary, locale }: PracticeConnectionCardProps) {
  const home = dictionary.academy.home

  if (!lesson) {
    return null
  }

  if (lesson.related_challenge_id) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Sword className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{home.practiceConnected}</h2>
              {lesson.related_challenge_title && (
                <p className="mt-1 truncate text-sm text-muted-foreground">{lesson.related_challenge_title}</p>
              )}
            </div>
          </div>

          <Button asChild variant="outline" className="shrink-0 border-primary/30 bg-background/40">
            <Link href={`/${locale}/academy/challenges/${lesson.related_challenge_id}`}>
              {home.startChallenge}
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{home.noChallengeAttached}</p>
    </div>
  )
}
