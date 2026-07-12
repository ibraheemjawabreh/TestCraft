import { requireTester } from '@/lib/auth/require-tester'
import { getTesterReports } from '@/lib/academy/reports'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'

import { AcademyLayout } from '@/components/academy/academy-layout'
import { ReportsTable } from '@/components/academy/reports-table'
import { FileText } from 'lucide-react'

export default async function AcademyReportsPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const { data: reports, error } = await getTesterReports(user.id)

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {dictionary.academy.yourReports}
            </h1>
            <p className="text-sm text-muted-foreground">
              {dictionary.academy.bugReports}
            </p>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
          </div>
        ) : (
          <ReportsTable reports={reports ?? []} dictionary={dictionary} locale={locale} />
        )}
      </div>
    </AcademyLayout>
  )
}
