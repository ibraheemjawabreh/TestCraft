import { resolveLocale } from '@/lib/locale'
import { ProgressDashboard } from '@/components/academy/progress/progress-dashboard'
import { getTesterProgress } from '@/lib/academy/progress'
import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { getDisplayName } from '@/lib/auth/account-identity'

export default async function AcademyProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)
  const { data: progress, error } = await getTesterProgress(user.id, profile)

  return error || !progress ? (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
    </div>
  ) : (
    <ProgressDashboard progress={progress} dictionary={dictionary} locale={locale}
      displayName={getDisplayName(user, profile.username, locale)} />
  )
}
