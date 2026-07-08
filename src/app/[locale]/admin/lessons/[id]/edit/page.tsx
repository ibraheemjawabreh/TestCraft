import { redirect } from 'next/navigation'

import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getAdminLessonById } from '@/lib/admin/lessons'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { LessonForm } from '@/components/admin/lessons/lesson-form'

export default async function AdminEditLessonPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string }
}) {
  const dictionary = await getDictionary(locale)

  const [lessonResult, pathsResult] = await Promise.all([
    getAdminLessonById(id),
    getAdminLearningPaths(),
  ])

  if (!lessonResult.data) {
    redirect(`/${locale}/admin/lessons`)
  }

  const lesson = lessonResult.data
  const paths = pathsResult.data ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.learning.editLesson}
        </h1>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
        <LessonForm
          paths={paths}
          dictionary={dictionary}
          locale={locale}
          initialData={{
            id: lesson.id,
            learning_path_id: lesson.learning_path_id,
            title_en: lesson.title_en || '',
            title_ar: lesson.title_ar || '',
            slug: lesson.slug,
            summary_en: lesson.summary_en || '',
            summary_ar: lesson.summary_ar || '',
            content_en: lesson.content_en || '',
            content_ar: lesson.content_ar || '',
            objectives_en: lesson.objectives_en || [],
            objectives_ar: lesson.objectives_ar || [],
            estimated_minutes: lesson.estimated_minutes,
            difficulty: lesson.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
            sort_order: lesson.sort_order,
            is_published: lesson.is_published,
          }}
        />
      </div>
    </div>
  )
}
