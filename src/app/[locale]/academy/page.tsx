import { resolveLocale } from '@/lib/locale'
import { ModuleView } from '@/components/academy/home/module-view'
import { getLearningPathWithProgress, getAllLearningPaths } from '@/lib/academy/services/ModuleService'
import { requireTester } from '@/lib/auth/require-tester'
import { getDisplayName } from '@/lib/auth/account-identity'
import { getDictionary } from '@/i18n/get-dictionary'
import Link from 'next/link'

const pathIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export default async function AcademyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ path?: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const selected = (await searchParams)?.path
  const pathsPromise = getAllLearningPaths(locale)
  // On a path switch the ID is already known. Start the scoped reads while
  // validating that the path is still in the student's visible catalog.
  const selectedData = typeof selected === 'string' && pathIdPattern.test(selected)
    ? getLearningPathWithProgress(selected, user.id, locale,
      pathsPromise.then(({ data }) => data?.find(path => path.id === selected) ?? null))
    : null
  const paths = (await pathsPromise).data ?? []
  const activePath = paths.find(p => p.id === selected) ?? paths[0]

  if (!activePath) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
      </div>
    )
  }

  const { data: pathData, error } = await (selectedData && activePath.id === selected
    ? selectedData
    : getLearningPathWithProgress(activePath.id, user.id, locale, activePath))

  return error || !pathData ? (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
    </div>
  ) : (
    <div className="space-y-6">
    <nav aria-label={locale === 'ar' ? 'مسارات التعلم' : 'Learning paths'} className="flex flex-wrap gap-2">
      {paths.map(path => <Link key={path.id} href={`/${locale}/academy?path=${path.id}`} aria-current={path.id === activePath.id ? 'page' : undefined} className={`rounded-lg border px-4 py-2 text-sm font-medium ${path.id === activePath.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{path.title}</Link>)}
    </nav>
    <ModuleView
      pathData={pathData}
      dictionary={dictionary}
      locale={locale}
      username={getDisplayName(user, profile.username, locale)}
    />
    </div>
  )
}
