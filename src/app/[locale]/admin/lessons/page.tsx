import Link from 'next/link'
import { Plus, Route } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getAdminLessons } from '@/lib/admin/lessons'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { AdminLessonsTable } from '@/components/admin/lessons/admin-lessons-table'
import { LearningPathForm } from '@/components/admin/lessons/learning-path-form'

export default async function AdminLessonsPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)

  const [lessonsResult, pathsResult] = await Promise.all([
    getAdminLessons(),
    getAdminLearningPaths(),
  ])

  const lessons = lessonsResult.data ?? []
  const paths = pathsResult.data ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {dictionary.learning.lessonsManagement}
          </h1>
          <p className="text-muted-foreground">
            {dictionary.learning.lessonsManagementSubtitle}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/lessons/new`}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 self-start"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {dictionary.learning.createLesson}
        </Link>
      </div>

      {/* Learning Paths Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Route className="h-5 w-5 text-primary" aria-hidden="true" />
            {dictionary.learning.paths}
          </h2>
        </div>

        {paths.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dictionary.learning.noPaths}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paths.map((path) => (
              <div
                key={path.id}
                className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground text-sm">{path.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${path.is_active ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                    {path.is_active ? dictionary.learning.active : dictionary.learning.inactive}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{path.description}</p>
                <p className="text-xs text-muted-foreground">
                  {path.lessons_count} {dictionary.learning.lessons}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create Path Form */}
        <details className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
          <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-foreground hover:text-primary transition-colors">
            + {dictionary.learning.createPath}
          </summary>
          <div className="px-6 pb-6">
            <LearningPathForm dictionary={dictionary} locale={locale} />
          </div>
        </details>
      </section>

      {/* Lessons Table */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{dictionary.learning.lessons}</h2>
        <AdminLessonsTable
          lessons={lessons}
          paths={paths}
          dictionary={dictionary}
          locale={locale}
        />
      </section>
    </div>
  )
}
