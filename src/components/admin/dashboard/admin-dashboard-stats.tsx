import {
  Award,
  Bot,
  Bug,
  CheckCircle2,
  CircleOff,
  ClipboardList,
  Gauge,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'

import { AdminStatCard } from '@/components/admin/dashboard/admin-stat-card'
import type { Dictionary } from '@/i18n/types'
import type { AdminDashboardStats } from '@/lib/admin/dashboard'

interface AdminDashboardStatsProps {
  dictionary: Dictionary
  stats: AdminDashboardStats
}

export function AdminDashboardStats({ dictionary, stats }: AdminDashboardStatsProps) {
  const t = dictionary.admin.dashboard
  const numberFormatter = new Intl.NumberFormat()

  const cards = [
    { title: t.totalUsers, value: stats.totalUsers, icon: Users },
    { title: t.totalAdmins, value: stats.totalAdmins, icon: ShieldCheck },
    { title: t.totalTesters, value: stats.totalTesters, icon: UserCheck },
    { title: t.totalChallenges, value: stats.totalChallenges, icon: Trophy },
    { title: t.activeChallenges, value: stats.activeChallenges, icon: CheckCircle2 },
    { title: t.inactiveChallenges, value: stats.inactiveChallenges, icon: CircleOff },
    { title: t.totalHiddenBugs, value: stats.totalHiddenBugs, icon: Bug },
    { title: t.totalBugReports, value: stats.totalBugReports, icon: ClipboardList },
    { title: t.pendingReports, value: stats.pendingReports, icon: Gauge },
    { title: t.reviewedReports, value: stats.reviewedReports, icon: CheckCircle2 },
    { title: t.rejectedReports, value: stats.rejectedReports, icon: XCircle },
    { title: t.totalAiEvaluations, value: stats.totalAiEvaluations, icon: Bot },
    { title: t.totalXpAwarded, value: numberFormatter.format(stats.totalXpAwarded), icon: Zap },
    { title: t.averageAiScore, value: stats.averageAiScore, icon: Sparkles },
    { title: t.totalBadges, value: stats.totalBadges, icon: Award },
    { title: t.awardedBadges, value: stats.awardedBadges, icon: Award },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <AdminStatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={<card.icon className="h-5 w-5" aria-hidden="true" />}
        />
      ))}
    </section>
  )
}
