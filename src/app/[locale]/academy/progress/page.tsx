import { AcademyLayout } from '@/components/academy/academy-layout'
import { ProgressDashboard } from '@/components/academy/progress/progress-dashboard'
import { getTesterProgress } from '@/lib/academy/progress'
import { requireTester } from '@/lib/auth/require-tester'
import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'

export default async function AcademyProgressPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)
  const { data: progress, error } = await getTesterProgress(user.id, profile)

  return error || !progress ? (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
    </div>
  ) : (
    <ProgressDashboard progress={progress} dictionary={dictionary} />
  )
}
