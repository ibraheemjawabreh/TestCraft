import { resolveLocale } from '@/lib/locale'
import { AcademyLayout } from '@/components/academy/academy-layout'
import { ModuleView } from '@/components/academy/home/module-view'
import { getLearningPathWithProgress, getAllLearningPaths } from '@/lib/academy/services/ModuleService'
import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import Link from 'next/link'

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

  const pathsResult = await getAllLearningPaths(locale)
  const paths = pathsResult.data ?? []
  const selected = (await searchParams)?.path
  const activePath = paths.find(p => p.id === selected) ?? paths[0]

  if (!activePath) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
      </div>
    )
  }

  const { data: pathData, error } = await getLearningPathWithProgress(activePath.id, user.id, locale)

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
      username={profile.username}
    />
    </div>
  )
}
