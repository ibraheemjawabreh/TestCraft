import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ChallengeCard } from './challenge-card'
import { AcademyEmptyState } from './academy-empty-state'
import { Sword } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ChallengeWithStatus } from '@/lib/academy/challenges'

interface RecommendedChallengesProps {
  challenges: ChallengeWithStatus[]
  dictionary: Dictionary
  locale: Locale
}

export function RecommendedChallenges({
  challenges,
  dictionary,
  locale,
}: RecommendedChallengesProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {dictionary.academy.continueLearning}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {dictionary.academy.recommendedChallenges}
          </p>
        </div>
        <Link
          href={`/${locale}/academy/challenges`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {dictionary.academy.browseChallenges}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {challenges.length === 0 ? (
        <AcademyEmptyState
          icon={Sword}
          message={dictionary.academy.noPracticalChallenges}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              dictionary={dictionary}
              locale={locale}
            />
          ))}
        </div>
      )}
    </section>
  )
}
