import {
  Sword,
  Target,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Bot,
  Award,
} from 'lucide-react'
import type { Dictionary } from '@/i18n/types'

interface StatsData {
  activeChallengesCount: number
  attemptedChallengesCount: number
  totalReports: number
  pendingReports: number
  reviewedReports: number
  rejectedReports: number
  aiEvaluationsCount: number
  badgesCount: number
}

interface AcademyStatsProps {
  stats: StatsData
  dictionary: Dictionary
}

interface StatItem {
  label: string
  value: number
  icon: React.ElementType
  colorClass: string
  bgClass: string
}

export function AcademyStats({ stats, dictionary }: AcademyStatsProps) {
  const items: StatItem[] = [
    {
      label: dictionary.academy.activeChallenges,
      value: stats.activeChallengesCount,
      icon: Sword,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      label: dictionary.academy.attemptedChallenges,
      value: stats.attemptedChallengesCount,
      icon: Target,
      colorClass: 'text-violet-400',
      bgClass: 'bg-violet-500/10',
    },
    {
      label: dictionary.academy.bugReports,
      value: stats.totalReports,
      icon: FileText,
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/10',
    },
    {
      label: dictionary.academy.pendingReviews,
      value: stats.pendingReports,
      icon: Clock,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
    },
    {
      label: dictionary.academy.reviewedReports,
      value: stats.reviewedReports,
      icon: CheckCircle,
      colorClass: 'text-green-400',
      bgClass: 'bg-green-500/10',
    },
    {
      label: dictionary.academy.rejectedReports,
      value: stats.rejectedReports,
      icon: XCircle,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
    },
    {
      label: dictionary.academy.aiEvaluations,
      value: stats.aiEvaluationsCount,
      icon: Bot,
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-500/10',
    },
    {
      label: dictionary.academy.badgesEarned,
      value: stats.badgesCount,
      icon: Award,
      colorClass: 'text-yellow-400',
      bgClass: 'bg-yellow-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <div
            aria-hidden="true"
            className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-primary/5 blur-xl pointer-events-none"
          />
          <div className="flex items-start justify-between gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bgClass}`}>
              <item.icon className={`h-4 w-4 ${item.colorClass}`} aria-hidden="true" />
            </div>
            <span className={`text-2xl font-bold tracking-tight ${item.colorClass}`}>
              {item.value}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground leading-tight">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}
