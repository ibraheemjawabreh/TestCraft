import { resolveLocale } from '@/lib/locale'
import NextLink from 'next/link'
import { Plus, Trophy, Target, LayoutDashboard, Bug, Zap, Layers } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminChallenges } from '@/lib/admin/challenges'
import { ChallengesTable } from '@/components/admin/challenges/challenges-table'
import { ChallengeStat } from '@/components/admin/challenges/challenge-stats'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'

interface ChallengesPageProps {
  params: Promise<{ locale: string }>
}

export default async function ChallengesPage({ params }: ChallengesPageProps) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const { data: challenges, error } = await getAdminChallenges()

  const safeChallenges = challenges ?? []

  // Calculate stats
  const total = safeChallenges.length
  const practical = safeChallenges.filter(
    (c) => (c as unknown as { workflow_type?: string }).workflow_type === 'practical',
  ).length
  const legacy = safeChallenges.filter(
    (c) => (c as unknown as { workflow_type?: string }).workflow_type !== 'practical',
  ).length
  const totalBugs = safeChallenges.reduce((sum, c) => sum + c.hidden_bugs_count, 0)

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {dictionary.admin.challenges.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {dictionary.admin.challenges.subtitle}
          </p>
        </div>
        {/* Only one official creation path: Practical Challenge Builder */}
        <Button asChild className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <NextLink href={`/${locale}/admin/challenges/new`}>
            <Plus className="h-4 w-4" />
            Create Practical Challenge
          </NextLink>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <ChallengeStat
          title={dictionary.admin.challenges.totalChallenges}
          value={total}
          icon={<LayoutDashboard className="h-5 w-5" />}
        />
        <ChallengeStat
          title="Practical"
          value={practical}
          icon={<Zap className="h-5 w-5 text-violet-500" />}
        />
        <ChallengeStat
          title="Legacy"
          value={legacy}
          icon={<Layers className="h-5 w-5 text-zinc-500" />}
        />
        <ChallengeStat
          title={dictionary.admin.challenges.totalHiddenBugs}
          value={totalBugs}
          icon={<Bug className="h-5 w-5" />}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <ChallengesTable
        challenges={safeChallenges}
        dictionary={dictionary.admin.challenges}
        locale={locale}
      />
    </div>
  )
}
