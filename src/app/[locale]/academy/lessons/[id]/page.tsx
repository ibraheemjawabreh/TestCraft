import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getLessonForTester, getNextLessonForTester } from '@/lib/academy/lessons'
import { markLessonOpened } from '@/lib/academy/progress'
import { AcademyLayout } from '@/components/academy/academy-layout'
import { LessonViewer } from '@/components/academy/learning/lesson-viewer'
import { LessonActions } from '@/components/academy/learning/lesson-actions'

export default async function TesterLessonPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const lessonResult = await getLessonForTester(id, user.id)

  if (!lessonResult.data) {
    redirect(`/${locale}/academy`)
  }

  const lesson = lessonResult.data

  // Track that the user opened this lesson
  await markLessonOpened(user.id, id)

  // Get next lesson for navigation
  const nextResult = await getNextLessonForTester(user.id)
  const nextLessonId = nextResult.data?.id !== id ? (nextResult.data?.id ?? null) : null

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Back */}
        <Link
          href={`/${locale}/academy`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {dictionary.learning.backToAcademy}
        </Link>

        {/* Lesson Content */}
        <LessonViewer lesson={lesson} dictionary={dictionary} />

        {/* Actions */}
        <LessonActions
          lessonId={lesson.id}
          userId={user.id}
          isCompleted={lesson.is_completed}
          relatedChallengeId={lesson.related_challenge_id}
          nextLessonId={nextLessonId}
          dictionary={dictionary}
          locale={locale}
        />
      </div>
    </AcademyLayout>
  )
}
