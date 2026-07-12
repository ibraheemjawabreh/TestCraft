import { notFound } from 'next/navigation'
import NextLink from 'next/link'
import { ArrowLeft, ArrowRight, Pencil, Trophy, Target, ShieldAlert, Users } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminChallengeById } from '@/lib/admin/challenges'
import { getHiddenBugsByChallengeId } from '@/lib/admin/hidden-bugs'
import { HiddenBugsList } from '@/components/admin/challenges/hidden-bugs-list'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Locale } from '@/i18n/config'

interface ChallengeDetailsPageProps {
  params: {
    locale: Locale
    id: string
  }
}

const difficultyColor: Record<string, string> = {
  Beginner: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Intermediate: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Advanced: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

export default async function ChallengeDetailsPage({
  params: { locale, id },
}: ChallengeDetailsPageProps) {
  const dictionary = await getDictionary(locale)
  const isRtl = locale === 'ar'

  // Fetch data
  const [{ data: challenge }, { data: bugs }] = await Promise.all([
    getAdminChallengeById(id),
    getHiddenBugsByChallengeId(id),
  ])

  if (!challenge) {
    notFound()
  }

  const safeBugs = bugs ?? []

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0 mt-1">
            <NextLink href={`/${locale}/admin/challenges`}>
              {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </NextLink>
          </Button>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {challenge.title}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className={difficultyColor[challenge.difficulty] ?? ''}>
                {challenge.difficulty}
              </Badge>
              <Badge
                variant="outline"
                className={
                  challenge.is_active
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30'
                }
              >
                {challenge.is_active
                  ? dictionary.admin.challenges.active
                  : dictionary.admin.challenges.inactive}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" className="gap-2">
            <NextLink href={`/${locale}/admin/challenges/${challenge.id}/submissions`}>
              <Users className="h-4 w-4" />
              {dictionary.admin.challenges.submissions}
            </NextLink>
          </Button>
          <Button asChild className="gap-2">
            <NextLink href={`/${locale}/admin/challenges/${challenge.id}/edit`}>
              <Pencil className="h-4 w-4" />
              {dictionary.admin.challenges.editChallenge}
            </NextLink>
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {dictionary.admin.challenges.baseXpReward}
              </p>
              <p className="text-2xl font-bold">{challenge.base_xp_reward}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {dictionary.admin.challenges.totalHiddenBugs}
              </p>
              <p className="text-2xl font-bold">{safeBugs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {dictionary.admin.challenges.difficulty}
              </p>
              <p className="text-lg font-bold">{challenge.difficulty}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl p-6 sm:p-8">
        <h3 className="font-heading text-lg font-semibold mb-4">
          {dictionary.admin.challenges.description}
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
          {challenge.description}
        </div>
      </div>

      {/* Hidden Bugs */}
      <HiddenBugsList
        challengeId={challenge.id}
        bugs={safeBugs}
        dictionary={dictionary.admin.challenges}
        validationDictionary={dictionary.validation}
        locale={locale}
      />
    </div>
  )
}
