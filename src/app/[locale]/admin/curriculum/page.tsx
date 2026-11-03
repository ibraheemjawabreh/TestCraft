import { resolveLocale } from '@/lib/locale'
import { requireAdmin } from '@/lib/auth/require-admin'
import { CurriculumFactory } from '@/components/admin/curriculum/curriculum-factory'
import { getDictionary } from '@/i18n/get-dictionary'
import { getCurriculumTree } from '@/lib/admin/curriculum'
import { CurriculumManager } from '@/components/admin/curriculum/CurriculumManager'
import type { Locale } from '@/i18n/config'

export default async function CurriculumPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  await requireAdmin(locale)
  const dictionary = await getDictionary(locale)
  const { data, error } = await getCurriculumTree()

  if (error || !data) {
    return (
      <div className="p-8 text-center text-destructive">
        <CurriculumFactory dictionary={dictionary} locale={locale} />
        <p>{dictionary.factory.failed}: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.curriculum?.title || 'Learning Management'}
        </h1>
        <p className="text-muted-foreground">
          {dictionary.curriculum?.subtitle || 'Manage your learning paths, modules, lessons, and challenges all in one place.'}
        </p>
      </div>

      <CurriculumFactory dictionary={dictionary} locale={locale} />

      <CurriculumManager
        initialPaths={data.paths}
        initialStats={data.stats}
        dictionary={dictionary}
        locale={locale}
      />
    </div>
  )
}
