import { requireTester } from '@/lib/auth/require-tester'
import { getActiveChallengesForTester } from '@/lib/academy/challenges'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { AcademyLayout } from '@/components/academy/academy-layout'
import { ChallengesClient } from '@/components/academy/challenges-client'
import { Sword } from 'lucide-react'

export default async function AcademyChallengesPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const { data: challenges, error } = await getActiveChallengesForTester(user.id, locale)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sword className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {dictionary.navigation.challenges}
            </h1>
            <p className="text-sm text-muted-foreground">
              {dictionary.academy.continueLearning}
            </p>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
          </div>
        ) : (
          <ChallengesClient
            challenges={challenges ?? []}
            dictionary={dictionary}
            locale={locale}
          />
        )}
      </div>
    </AcademyLayout>
  )
}
