import Image from 'next/image'
import {
  Award,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Sword,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { Dictionary } from '@/i18n/types'
import type { TesterProgressStats } from '@/lib/academy/progress'

import { ProgressStatCard } from './progress-stat-card'

interface ProgressDashboardProps {
  progress: TesterProgressStats
  dictionary: Dictionary
}

export function ProgressDashboard({ progress, dictionary }: ProgressDashboardProps) {
  const labels = dictionary.academy.progress
  const xpForNextLevel = Math.max(progress.currentLevel, 1) * 500
  const xpProgress = xpForNextLevel > 0 ? Math.min((progress.totalXp % xpForNextLevel) / xpForNextLevel, 1) : 0

  return (
    <div className="space-y-8">
      <div className="academy-page-heading space-y-2 rounded-2xl p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {labels.title}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{labels.subtitle}</p>
      </div>

      <Card className="academy-surface overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {progress.profile.avatar_url ? (
                <Image
                  src={progress.profile.avatar_url}
                  alt={progress.profile.username}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-xl object-cover ring-2 ring-[#f97316]/30"
                />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-cyber-gradient text-2xl font-bold text-white">
                  {progress.profile.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-heading text-2xl font-bold text-foreground">
                  {progress.profile.username}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {labels.currentLevel} {progress.currentLevel}
                </p>
              </div>
            </div>

            <div className="w-full max-w-xl space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#ea580c]">
                  {progress.totalXp.toLocaleString()} {dictionary.academy.xp}
                </span>
                <span className="text-muted-foreground">
                  {xpForNextLevel.toLocaleString()} {dictionary.academy.xp}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-cyber-gradient"
                  style={{ width: `${Math.max(xpProgress * 100, 3)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ProgressStatCard label={labels.totalXp} value={progress.totalXp} icon={Zap} tone="primary" />
        <ProgressStatCard label={labels.currentLevel} value={progress.currentLevel} icon={Trophy} tone="yellow" />
        <ProgressStatCard label={labels.activeChallenges} value={progress.activeChallengesCount} icon={Sword} tone="violet" />
        <ProgressStatCard label={labels.attemptedChallenges} value={progress.attemptedChallengesCount} icon={Target} tone="primary" />
        <ProgressStatCard label={labels.bugReports} value={progress.totalReports} icon={FileText} tone="blue" />
        <ProgressStatCard label={labels.pendingReports} value={progress.pendingReports} icon={Clock} tone="amber" />
        <ProgressStatCard label={labels.reviewedReports} value={progress.reviewedReports} icon={CheckCircle2} tone="green" />
        <ProgressStatCard label={labels.rejectedReports} value={progress.rejectedReports} icon={XCircle} tone="red" />
        <ProgressStatCard label={labels.aiEvaluations} value={progress.aiEvaluationsCount} icon={Bot} tone="cyan" />
        <ProgressStatCard label={labels.badgesEarned} value={progress.badgesCount} icon={Award} tone="yellow" />
      </div>
    </div>
  )
}
