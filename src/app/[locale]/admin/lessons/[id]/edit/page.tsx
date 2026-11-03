import { resolveLocale } from '@/lib/locale'
import { notFound } from 'next/navigation'
import { getAdminLessonById } from '@/lib/admin/lessons'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { getAdminModules } from '@/lib/admin/modules'
import { LessonContentStudio } from '@/components/admin/lessons/lesson-content-studio'
import type { Locale } from '@/i18n/config'

interface EditLessonPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function EditLessonPage({
  params,
}: EditLessonPageProps) {
  const { locale: routeLocale, id } = await params
  const locale = resolveLocale(routeLocale)

  const [lessonRes, pathsRes, modulesRes] = await Promise.all([
    getAdminLessonById(id, locale),
    getAdminLearningPaths(),
    getAdminModules(),
  ])

  if (!lessonRes.data) {
    notFound()
  }

  const lesson = lessonRes.data
  const paths = pathsRes.data ?? []
  const modules = (modulesRes.data ?? []).map((m) => ({
    id: m.id,
    title_en: m.title_en,
    title_ar: m.title_ar,
    learning_path_id: m.learning_path_id,
  }))

  return (
    <LessonContentStudio
      paths={paths}
      modules={modules}
      locale={locale}
      initialLesson={lesson}
    />
  )
}
