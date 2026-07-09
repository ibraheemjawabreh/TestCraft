import { AcademyLayout } from '@/components/academy/academy-layout'
import { ActivityDashboard } from '@/components/academy/activity/activity-dashboard'
import { getTesterActivity } from '@/lib/academy/activity'
import { requireTester } from '@/lib/auth/require-tester'
import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'

export default async function AcademyActivityPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)
  const { data: activity, error } = await getTesterActivity(user.id)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      {error || !activity ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      ) : (
        <ActivityDashboard activity={activity} dictionary={dictionary} locale={locale} />
      )}
    </AcademyLayout>
  )
}
