import { requireTester } from '@/lib/auth/require-tester'
import { getTesterBadges } from '@/lib/academy/badges'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'

import { AcademyLayout } from '@/components/academy/academy-layout'
import { BadgesPreview } from '@/components/academy/badges-preview'
import { Award } from 'lucide-react'

export default async function AcademyBadgesPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const { data: badges, error } = await getTesterBadges(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
          <Award className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {dictionary.academy.badgesEarned}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dictionary.academy.badgesPreview}
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      ) : (
        <BadgesPreview badges={badges ?? []} dictionary={dictionary} />
      )}
    </div>
  )
}
