import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { getAdminModules } from '@/lib/admin/modules'
import { LessonContentStudio } from '@/components/admin/lessons/lesson-content-studio'
import type { Locale } from '@/i18n/config'

interface NewLessonPageProps {
  params: {
    locale: Locale
  }
  searchParams?: {
    pathId?: string
    moduleId?: string
  }
}

export default async function NewLessonPage({
  params: { locale },
  searchParams,
}: NewLessonPageProps) {
  const [pathsRes, modulesRes] = await Promise.all([
    getAdminLearningPaths(),
    getAdminModules(),
  ])

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
      defaultPathId={searchParams?.pathId}
      defaultModuleId={searchParams?.moduleId}
    />
  )
}
