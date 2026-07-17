import { AcademyLayout } from '@/components/academy/academy-layout'
import { ModuleView } from '@/components/academy/home/module-view'
import { getLearningPathWithProgress, getAllLearningPaths } from '@/lib/academy/services/ModuleService'
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

  // Get first active learning path (single path for MVP)
  const pathsResult = await getAllLearningPaths(locale)
  const paths = pathsResult.data ?? []
  const activePath = paths[0]

  if (!activePath) {
    return (
      <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      </AcademyLayout>
    )
  }

  const { data: pathData, error } = await getLearningPathWithProgress(activePath.id, user.id, locale)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      {error || !pathData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      ) : (
        <ModuleView
          pathData={pathData}
          dictionary={dictionary}
          locale={locale}
          username={profile.username}
        />
      )}
    </AcademyLayout>
  )
}
