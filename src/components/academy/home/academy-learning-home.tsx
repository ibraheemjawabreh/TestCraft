import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { LearningOverview } from '@/lib/academy/learning'

import { LessonTimeline } from './lesson-timeline'
import { MainLearningCard } from './main-learning-card'
import { PracticeConnectionCard } from './practice-connection-card'

interface AcademyLearningHomeProps {
  overview: LearningOverview
  dictionary: Dictionary
  locale: Locale
  username: string
}

export function AcademyLearningHome({
  overview,
  dictionary,
  locale,
  username,
}: AcademyLearningHomeProps) {
  const currentLesson =
    overview.lessons.find((lesson) => lesson.status === 'current') ??
    overview.lessons.find(
      (lesson) => lesson.is_unlocked && lesson.related_challenge_id && !lesson.challenge_submitted,
    ) ??
    overview.lessons.find((lesson) => lesson.is_unlocked && !lesson.is_completed) ??
    null

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.academy.home.title.replace('{username}', username)}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{dictionary.academy.home.subtitle}</p>
      </div>

      <MainLearningCard overview={overview} dictionary={dictionary} locale={locale} />
      <PracticeConnectionCard lesson={currentLesson} dictionary={dictionary} locale={locale} />
      <LessonTimeline lessons={overview.lessons} dictionary={dictionary} locale={locale} />
    </div>
  )
}
