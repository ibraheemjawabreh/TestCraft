import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, Zap, FileText } from 'lucide-react'

import { requireTester } from '@/lib/auth/require-tester'
import { getChallengeForTester } from '@/lib/academy/challenges'
import { getTesterReportsForChallenge } from '@/lib/academy/reports'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'

import { AcademyLayout } from '@/components/academy/academy-layout'
import { BugReportForm } from '@/components/academy/bug-report-form'

export default async function ChallengeDetailsPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const { data: challengeData, error: challengeError } = await getChallengeForTester(id, user.id, locale)

  if (challengeError === 'challenge_not_found') {
    notFound()
  }

  if (challengeError || !challengeData) {
    return (
      <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      </AcademyLayout>
    )
  }

  const { challenge } = challengeData

  const { data: previousReports, error: reportsError } = await getTesterReportsForChallenge(
    user.id,
    id,
  )

  const DIFFICULTY_CONFIG = {
    Beginner: {
      label: dictionary.academy.beginner,
      colorClass: 'text-green-400 bg-green-500/10 border-green-500/20',
    },
    Intermediate: {
      label: dictionary.academy.intermediate,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    Advanced: {
      label: dictionary.academy.advanced,
      colorClass: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
  } as const

  const difficultyConf = DIFFICULTY_CONFIG[challenge.difficulty]

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/academy/challenges`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {dictionary.academy.backToChallenges}
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Challenge Header */}
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
              <div className="flex flex-wrap gap-3 mb-4">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${difficultyConf.colorClass}`}
                >
                  {difficultyConf.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  {challenge.base_xp_reward} {dictionary.academy.xp}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
                {challenge.title}
              </h1>
              <div className="mt-4 prose prose-invert max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{challenge.description}</p>
              </div>
            </div>

            {/* Submit Report Form */}
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
              <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  {dictionary.academy.submitBugReport}
                </h2>
              </div>
              
              <BugReportForm 
                challengeId={challenge.id} 
                dictionary={dictionary}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Previous Reports */}
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-xl shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {dictionary.academy.previousReports}
                </h3>
              </div>

              {reportsError ? (
                <p className="text-sm text-destructive">{dictionary.academy.failedToLoad}</p>
              ) : previousReports && previousReports.length > 0 ? (
                <div className="space-y-3">
                  {previousReports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-lg border border-border/50 bg-background/40 p-3"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {report.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize">{report.status}</span>
                        <span>
                          {new Date(report.created_at ?? '').toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-dashed border-border/50 text-center">
                  {dictionary.academy.noPreviousReports}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AcademyLayout>
  )
}
