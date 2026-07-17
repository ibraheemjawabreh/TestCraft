import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { getAdminModules } from '@/lib/admin/modules'
import { LessonForm } from '@/components/admin/lessons/lesson-form'

export default async function AdminNewLessonPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const [pathsResult, modulesResult] = await Promise.all([
    getAdminLearningPaths(),
    getAdminModules(),
  ])
  const paths = pathsResult.data ?? []
  const modules = modulesResult.data ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.learning.createLesson}
        </h1>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
        {paths.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dictionary.learning.noPaths}</p>
        ) : (
          <LessonForm paths={paths} modules={modules} dictionary={dictionary} locale={locale} />
        )}
      </div>
    </div>
  )
}
