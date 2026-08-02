'use client'

import {
  Users, Trophy, BookOpen, ClipboardList,
  Map, Layers, FileText, CheckCircle2,
  Clock, XCircle, Route,
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

  const curriculumCards = [
    { title: 'Learning Paths',   value: stats.totalPaths,      icon: Route },
    { title: 'Modules',          value: stats.totalModules,    icon: Layers },
    { title: 'Lessons',          value: stats.totalLessons,    icon: BookOpen },
    { title: 'Challenges',       value: stats.totalChallenges, icon: Trophy },
  ]

  const userCards = [
    { title: t.activeUsers,      value: stats.totalStudents,   icon: Users },
    { title: 'Bug Reports',      value: stats.totalBugReports, icon: FileText },
  ]

  const attemptCards = [
    { title: t.pendingReviews,   value: stats.pendingReviews,  icon: Clock,         accent: 'amber' as const },
    { title: 'Approved',         value: stats.approvedAttempts, icon: CheckCircle2, accent: 'green' as const },
    { title: 'Rejected',         value: stats.rejectedAttempts, icon: XCircle,      accent: 'red'   as const },
  ]

  const staggerClasses = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8'] as const

  return (
    <div className="space-y-6">
      {/* Curriculum Stats */}
      <div className="animate-fade-in-up">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Curriculum</p>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {curriculumCards.map((card, i) => (
            <AdminStatCard
              key={card.title}
              title={card.title}
              value={card.value}
              className={staggerClasses[i]}
              icon={<card.icon className="h-5 w-5" aria-hidden="true" />}
            />
          ))}
        </section>
      </div>

      {/* Users & Reports */}
      <div className="animate-fade-in-up stagger-2">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Users & Reports</p>
        <section className="grid gap-4 sm:grid-cols-2">
          {userCards.map((card, i) => (
            <AdminStatCard
              key={card.title}
              title={card.title}
              value={card.value}
              className={staggerClasses[i + 4]}
              icon={<card.icon className="h-5 w-5" aria-hidden="true" />}
            />
          ))}
        </section>
      </div>

      {/* Attempt Reviews */}
      <div className="animate-fade-in-up stagger-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Attempt Reviews</p>
        <section className="grid gap-4 sm:grid-cols-3">
          {attemptCards.map((card, i) => (
            <AdminStatCard
              key={card.title}
              title={card.title}
              value={card.value}
              accent={card.accent}
              className={['stagger-6', 'stagger-7', 'stagger-8'][i]}
              icon={<card.icon className="h-5 w-5" aria-hidden="true" />}
            />
          ))}
        </section>
      </div>
    </div>
  )
}
