import { requireTester } from '@/lib/auth/require-tester'
import { getAcademyDashboardData } from '@/lib/academy/academy'
import { getAcademyLearningOverview } from '@/lib/academy/progress'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'

import { AcademyLayout } from '@/components/academy/academy-layout'
import { ProfileProgressCard } from '@/components/academy/profile-progress-card'
import { AcademyStats } from '@/components/academy/academy-stats'
import { RecommendedChallenges } from '@/components/academy/recommended-challenges'
import { RecentReports } from '@/components/academy/recent-reports'
import { RecentAiFeedback } from '@/components/academy/recent-ai-feedback'
import { BadgesPreview } from '@/components/academy/badges-preview'
import { ContinueLearningCard } from '@/components/academy/learning/continue-learning-card'
import { LearningPathTimeline } from '@/components/academy/learning/learning-path-timeline'

export default async function AcademyPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const { user, profile } = await requireTester(locale)

  const [dashboardResult, learningOverviewResult] = await Promise.all([
    getAcademyDashboardData(user.id, profile, locale),
    getAcademyLearningOverview(user.id, locale),
  ])

  if (dashboardResult.error || !dashboardResult.data || learningOverviewResult.error || !learningOverviewResult.data) {
    return (
      <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">{dictionary.academy.failedToLoad}</p>
        </div>
      </AcademyLayout>
    )
  }

  const {
    stats,
    recentReports,
    recentEvaluations,
    badges,
  } = dashboardResult.data

  const learningOverview = learningOverviewResult.data

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="space-y-10">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {dictionary.academy.welcomeBack},{' '}
            <span className="bg-cyber-gradient bg-clip-text text-transparent">
              {profile.username}
            </span>
          </h1>
          <p className="text-muted-foreground">{dictionary.academy.continueJourney}</p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-8">
            <ContinueLearningCard
              overview={learningOverview}
              dictionary={dictionary}
              locale={locale}
            />

            <div className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
              <LearningPathTimeline
                lessons={learningOverview.lessons}
                dictionary={dictionary}
                locale={locale}
              />
            </div>

            <RecommendedChallenges
              challenges={learningOverview.practiceChallenges}
              dictionary={dictionary}
              locale={locale}
            />
          </main>

          <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <ProfileProgressCard
              profile={profile}
              attemptedChallenges={stats.attemptedChallengesCount}
              reviewedReports={stats.reviewedReports}
              dictionary={dictionary}
            />
            <AcademyStats stats={stats} dictionary={dictionary} />
            <RecentReports
              reports={recentReports}
              dictionary={dictionary}
              locale={locale}
            />
            <RecentAiFeedback
              evaluations={recentEvaluations}
              dictionary={dictionary}
            />
            <BadgesPreview badges={badges} dictionary={dictionary} />
          </aside>
        </div>
      </div>
    </AcademyLayout>
  )
}
