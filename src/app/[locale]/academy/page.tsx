import { AcademyLayout } from '@/components/academy/academy-layout'
import { AcademyLearningHome } from '@/components/academy/home/academy-learning-home'
import { getAcademyLearningOverview } from '@/lib/academy/learning'
import { requireTester } from '@/lib/auth/require-tester'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'

export default async function AcademyPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)
  const { data: overview, error } = await getAcademyLearningOverview(user.id, locale)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      {error || !overview ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      ) : (
        <AcademyLearningHome
          overview={overview}
          dictionary={dictionary}
          locale={locale}
          username={profile.username}
        />
      )}
    </AcademyLayout>
  )
}
