import { resolveLocale } from '@/lib/locale'
import { getAdminAnalytics } from '@/lib/admin/analytics'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { AdminStatCard } from '@/components/admin/dashboard/admin-stat-card'
import {
  Users,
  UserCheck,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Trophy,
  CheckCircle2,
  CircleOff,
  ClipboardList,
  FileText,
  XCircle,
  Bot,
  Zap,
  Award,
  BarChart3,
} from 'lucide-react'

interface AdminAnalyticsPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function AdminAnalyticsPage({ params }: AdminAnalyticsPageProps) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const result = await getAdminAnalytics()
  const t = dictionary.admin.analytics
  const tDash = dictionary.admin.dashboard

  if (!result.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {tDash.failedToLoad}
      </div>
    )
  }

  const data = result.data

  const sections = [
    {
      title: t.users,
      icon: Users,
      stats: [
        { title: t.totalUsers, value: data.users.total, icon: Users },
        { title: t.testers, value: data.users.testers, icon: UserCheck },
        { title: t.admins, value: data.users.admins, icon: ShieldCheck },
      ],
    },
    {
      title: t.learning,
      icon: BookOpen,
      stats: [
        { title: t.learningPaths, value: data.learning.learningPaths, icon: BookOpen },
        { title: t.publishedLessons, value: data.learning.publishedLessons, icon: BookOpen },
        { title: t.completedLessons, value: data.learning.completedLessons, icon: CheckCircle2 },
        { title: t.lessonProgress, value: data.learning.lessonProgress, icon: GraduationCap },
      ],
    },
    {
      title: t.challenges,
      icon: Trophy,
      stats: [
        { title: t.activeChallenges, value: data.challenges.active, icon: CheckCircle2 },
        { title: t.inactiveChallenges, value: data.challenges.inactive, icon: CircleOff },
        { title: t.attemptedChallenges, value: data.challenges.attempted, icon: Users },
        { title: t.challengeAttempts, value: data.challenges.totalAttempts, icon: Trophy },
      ],
    },
    {
      title: t.reports,
      icon: ClipboardList,
      stats: [
        { title: t.totalReports, value: data.reports.total, icon: ClipboardList },
        { title: t.pendingReports, value: data.reports.pending, icon: FileText },
        { title: t.reviewedReports, value: data.reports.reviewed, icon: CheckCircle2 },
        { title: t.rejectedReports, value: data.reports.rejected, icon: XCircle },
      ],
    },
    {
      title: t.aiEvaluations,
      icon: Bot,
      stats: [
        { title: t.totalAiEvaluations, value: data.ai.totalEvaluations, icon: Bot },
        { title: t.averageAiScore, value: data.ai.averageScore, icon: BarChart3 },
        { title: t.totalXpFromAi, value: data.ai.totalXp, icon: Zap },
      ],
    },
    {
      title: t.badges,
      icon: Award,
      stats: [
        { title: t.badgesCount, value: data.badges.defined, icon: Award },
        { title: t.userBadgesCount, value: data.badges.awarded, icon: Award },
      ],
    },
  ]

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          {t.title}
        </h1>
        <p className="mt-2 text-lg max-w-3xl text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      <div className="space-y-12">
        {sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2 border-b pb-2">
              <section.icon className="h-5 w-5 text-muted-foreground" />
              {section.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.stats.map((stat) => (
                <AdminStatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  icon={<stat.icon className="h-5 w-5" aria-hidden="true" />}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
