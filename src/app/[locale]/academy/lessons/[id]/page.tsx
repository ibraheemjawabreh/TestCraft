import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getLessonWithModuleGate, getNextLessonForUser } from '@/lib/academy/services/LessonService'
import { markLessonInProgress } from '@/lib/academy/services/ProgressService'
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
  const isRtl = locale === 'ar'

  const lessonResult = await getLessonWithModuleGate(user.id, id, locale)

  if (!lessonResult.data) {
    // Redirect back to academy — lesson is locked or not found
    redirect(`/${locale}/academy`)
  }

  const lesson = lessonResult.data

  // Track that the user opened this lesson (mark in_progress)
  await markLessonInProgress(user.id, id)

  // Get next lesson for navigation
  const nextResult = await getNextLessonForUser(user.id, locale)
  const nextLessonId = nextResult.data?.id !== id ? (nextResult.data?.id ?? null) : null

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Breadcrumb: Back + Module name */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/academy`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {dictionary.learning.backToAcademy ?? 'Back to Academy'}
          </Link>
          {lesson.module_title && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">{lesson.module_title}</span>
            </>
          )}
        </div>

        {/* Lesson Content */}
        <LessonViewer lesson={lesson} dictionary={dictionary} />

        {/* Actions */}
        <LessonActions
          lessonId={lesson.id}
          userId={user.id}
          isCompleted={lesson.is_completed}
          relatedChallengeId={lesson.related_challenge_id ?? null}
          nextLessonId={nextLessonId}
          dictionary={dictionary}
          locale={locale}
        />
      </div>
    </AcademyLayout>
  )
}
