import Link from 'next/link'
import { BookOpen, FileText, Award, Sword } from 'lucide-react'

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
    getAcademyDashboardData(user.id, profile),
    getAcademyLearningOverview(user.id),
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
    recommendedChallenges,
    recentReports,
    recentEvaluations,
    badges,
  } = dashboardResult.data

  const learningOverview = learningOverviewResult.data

  return (
    <AcademyLayout dictionary={dictionary} locale={locale} username={profile.username}>
      <div className="space-y-10">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {dictionary.academy.welcomeBack},{' '}
            <span className="bg-cyber-gradient bg-clip-text text-transparent">
              {profile.username}
            </span>
          </h1>
          <p className="text-muted-foreground">{dictionary.academy.continueJourney}</p>
        </div>

        {/* ── Profile Progress Card ───────────────────────────────────── */}
        <ProfileProgressCard
          profile={profile}
          attemptedChallenges={stats.attemptedChallengesCount}
          reviewedReports={stats.reviewedReports}
          dictionary={dictionary}
        />

        {/* ── Stats Grid ─────────────────────────────────────────────── */}
        <section>
          <AcademyStats stats={stats} dictionary={dictionary} />
        </section>

        {/* ── Continue Learning ───────────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <div className="space-y-8">
            <ContinueLearningCard
              overview={learningOverview}
              dictionary={dictionary}
              locale={locale}
            />
            <RecommendedChallenges
              challenges={recommendedChallenges}
              dictionary={dictionary}
              locale={locale}
            />
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm lg:sticky lg:top-8">
            <LearningPathTimeline
              lessons={learningOverview.lessons}
              dictionary={dictionary}
              locale={locale}
            />
          </div>
        </div>

        {/* ── Two-column: Recent Reports + AI Feedback ────────────────── */}
        <div className="grid gap-8 lg:grid-cols-2">
          <RecentReports
            reports={recentReports}
            dictionary={dictionary}
            locale={locale}
          />
          <RecentAiFeedback
            evaluations={recentEvaluations}
            dictionary={dictionary}
          />
        </div>

        {/* ── Badges Preview ──────────────────────────────────────────── */}
        <BadgesPreview badges={badges} dictionary={dictionary} />

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            {dictionary.academy.quickActions}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                href: `/${locale}/academy/challenges`,
                label: dictionary.academy.browseChallenges,
                icon: Sword,
                colorClass: 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/15',
              },
              {
                href: `/${locale}/academy/reports`,
                label: dictionary.academy.viewReports,
                icon: FileText,
                colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15',
              },
              {
                href: `/${locale}/academy/challenges`,
                label: dictionary.academy.continueLearning,
                icon: BookOpen,
                colorClass: 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/15',
              },
              {
                href: `/${locale}/academy/badges`,
                label: dictionary.academy.viewBadges,
                icon: Award,
                colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15',
              },
            ].map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center text-sm font-medium transition-all hover:shadow-sm ${action.colorClass}`}
              >
                <action.icon className="h-6 w-6" aria-hidden="true" />
                {action.label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </AcademyLayout>
  )
}
