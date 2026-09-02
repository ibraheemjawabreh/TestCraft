import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminLessons } from '@/lib/admin/lessons'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { AdminLessonsTable } from '@/components/admin/lessons/admin-lessons-table'
import type { Locale } from '@/i18n/config'

export default async function AdminLessonsPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const [lessonsRes, pathsRes] = await Promise.all([
    getAdminLessons(locale),
    getAdminLearningPaths(),
  ])

  const lessons = lessonsRes.data ?? []
  const paths = pathsRes.data ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.learning?.lessonsManagement || 'Lessons Management'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {dictionary.learning?.lessonsManagementSubtitle ||
            'Create, edit, preview, and publish bilingual theory lessons with markdown formatting.'}
        </p>
      </div>

      {/* Main Table */}
      <AdminLessonsTable
        lessons={lessons}
        paths={paths}
        dictionary={dictionary}
        locale={locale}
      />
    </div>
  )
}
