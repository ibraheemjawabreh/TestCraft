import { Link } from 'lucide-react' // not the right Link, let's use next/link instead
import NextLink from 'next/link'
import { Plus, Trophy, Target, LayoutDashboard, Bug } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminChallenges } from '@/lib/admin/challenges'
import { ChallengesTable } from '@/components/admin/challenges/challenges-table'
import { ChallengeStat } from '@/components/admin/challenges/challenge-stats'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'

interface ChallengesPageProps {
  params: { locale: Locale }
}

export default async function ChallengesPage({ params: { locale } }: ChallengesPageProps) {
  const dictionary = await getDictionary(locale)
  const { data: challenges, error } = await getAdminChallenges()

  const safeChallenges = challenges ?? []
  
  // Calculate stats
  const total = safeChallenges.length
  const active = safeChallenges.filter((c) => c.is_active).length
  const inactive = total - active
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
        <Button asChild className="gap-2">
          <NextLink href={`/${locale}/admin/challenges/new`}>
            <Plus className="h-4 w-4" />
            {dictionary.admin.challenges.newChallenge}
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
          title={dictionary.admin.challenges.activeChallenges}
          value={active}
          icon={<Target className="h-5 w-5" />}
        />
        <ChallengeStat
          title={dictionary.admin.challenges.inactiveChallenges}
          value={inactive}
          icon={<Trophy className="h-5 w-5" />}
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
