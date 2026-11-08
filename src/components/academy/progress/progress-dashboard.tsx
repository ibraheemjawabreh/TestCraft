'use client'

import Image from 'next/image'
import {
  Award, Bot, CheckCircle2, Clock, FileText,
  Sword, Target, Trophy, XCircle, Zap, BookOpen,
  ClipboardCheck, AlertCircle, TrendingUp,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { TesterProgressStats } from '@/lib/academy/progress'
import { ProgressStatCard } from './progress-stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { FormattedDate } from '@/components/ui/formatted-date'

interface ProgressDashboardProps {
  progress: TesterProgressStats
  dictionary: Dictionary
  locale: Locale
}

function AttemptStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    approved:  { label: 'Completed',       className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    started:   { label: 'In Progress',     className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    submitted: { label: 'Pending Review',  className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    reviewing: { label: 'Under Review',    className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' },
    rejected:  { label: 'Needs Improvement', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' }
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  )
}

export function ProgressDashboard({ progress, dictionary, locale }: ProgressDashboardProps) {
  const labels = dictionary.academy.progress
  const { rank, levelProgress, earnedBadges } = progress

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="academy-page-heading space-y-2 rounded-2xl p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {labels.title}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{labels.subtitle}</p>
      </div>

      {/* Profile + XP Card */}
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
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-cyber-gradient text-2xl font-bold text-white">
                  {progress.profile.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="truncate font-heading text-2xl font-bold text-foreground">
                    {progress.profile.username}
                  </h2>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {labels.title === 'تقدمي' ? rank.labelAr : rank.labelEn}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {labels.currentLevel} {progress.currentLevel}
                </p>
              </div>
            </div>

            <div className="w-full max-w-xl space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#ea580c]">
                  {progress.totalXp.toLocaleString('en-US')} {dictionary.academy.xp}
                </span>
                <span className="text-muted-foreground">
                  Lv {levelProgress.nextLevel} → {levelProgress.nextLevelRequiredXp.toLocaleString('en-US')} {dictionary.academy.xp}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-cyber-gradient transition-all duration-700"
                  style={{ width: `${Math.max(levelProgress.levelProgressPercentage, 3)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {levelProgress.xpNeededForNextLevel.toLocaleString('en-US')} {labels.title === 'تقدمي' ? 'نقاط متبقية للمستوى التالي' : 'XP needed for next level'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earned Badges */}
      <Card className="academy-surface">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Award className="h-4 w-4 text-primary" />
            Earned Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnedBadges.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No badges earned yet. Keep testing!</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {earnedBadges.map((badge) => (
                <div key={badge.id} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl w-[120px] text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {badge.icon_url ? (
                      <Image src={badge.icon_url} alt={badge.name} width={32} height={32} className="rounded-full" />
                    ) : (
                      <Award className="h-6 w-6" />
                    )}
                  </div>
                  <span className="text-xs font-semibold leading-tight">{badge.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    <FormattedDate value={badge.earned_at} locale={locale} dateStyle="medium" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProgressStatCard label={labels.totalXp} value={progress.totalXp} icon={Zap} tone="primary" />
        <ProgressStatCard label={labels.currentLevel} value={progress.currentLevel} icon={Trophy} tone="yellow" />
        <ProgressStatCard label="Completed Lessons" value={progress.completedLessonsCount} icon={BookOpen} tone="green" />
        <ProgressStatCard label="Completed Challenges" value={progress.completedChallengesCount} icon={CheckCircle2} tone="violet" />
      </div>

      {/* Attempt Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{progress.approvedAttempts}</p>
              <p className="text-xs text-muted-foreground">Approved Attempts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{progress.pendingAttempts}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{progress.rejectedAttempts}</p>
              <p className="text-xs text-muted-foreground">Needs Improvement</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attempts Table */}
      <Card className="academy-surface">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Recent Attempts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {progress.recentAttempts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ClipboardCheck className="h-6 w-6" />}
                title="No attempts yet"
                description="Complete a practical challenge and submit your attempt to see it here."
              />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {progress.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{attempt.challengeTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      <FormattedDate value={attempt.submittedAt} locale={locale} dateStyle="medium" />
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {attempt.earnedXp != null && attempt.earnedXp > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-500">
                        <Zap className="h-3 w-3" />
                        {attempt.earnedXp} XP
                      </span>
                    )}
                    <AttemptStatusBadge status={attempt.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bug Reports Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProgressStatCard label={labels.bugReports} value={progress.totalReports} icon={FileText} tone="blue" />
        <ProgressStatCard label={labels.pendingReports} value={progress.pendingReports} icon={Clock} tone="amber" />
        <ProgressStatCard label={labels.reviewedReports} value={progress.reviewedReports} icon={CheckCircle2} tone="green" />
        <ProgressStatCard label={labels.rejectedReports} value={progress.rejectedReports} icon={XCircle} tone="red" />
      </div>
    </div>
  )
}
