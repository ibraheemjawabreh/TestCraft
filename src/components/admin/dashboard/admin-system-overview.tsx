import {
  Users,
  Trophy,
  BookOpen,
  ClipboardList,
} from 'lucide-react'

import { AdminStatCard } from '@/components/admin/dashboard/admin-stat-card'
import type { Dictionary } from '@/i18n/types'
import type { AdminDashboardStats } from '@/lib/admin/dashboard'

interface AdminSystemOverviewProps {
  dictionary: Dictionary
  stats: AdminDashboardStats
}

export function AdminSystemOverview({ dictionary, stats }: AdminSystemOverviewProps) {
  const t = dictionary.admin.dashboard

  const cards = [
    { title: t.activeUsers, value: stats.activeUsers, icon: Users },
    { title: t.activeChallenges, value: stats.activeChallenges, icon: Trophy },
    { title: t.publishedLessons, value: stats.publishedLessons, icon: BookOpen },
    { title: t.pendingReports, value: stats.pendingReports, icon: ClipboardList },
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
