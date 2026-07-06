import Link from 'next/link'
import { Zap, ChevronRight } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ChallengeWithStatus, ChallengeStatus } from '@/lib/academy/challenges'

interface ChallengeCardProps {
  challenge: ChallengeWithStatus
  dictionary: Dictionary
  locale: Locale
}

const DIFFICULTY_CONFIG = {
  Beginner: {
    label: (d: Dictionary) => d.academy.beginner,
    colorClass: 'text-green-400 bg-green-500/10 border-green-500/20',
  },
  Intermediate: {
    label: (d: Dictionary) => d.academy.intermediate,
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  Advanced: {
    label: (d: Dictionary) => d.academy.advanced,
    colorClass: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
} as const

const STATUS_CONFIG: Record<
  ChallengeStatus,
  { label: (d: Dictionary) => string; dotClass: string }
> = {
  not_started: {
    label: (d) => d.academy.notStarted,
    dotClass: 'bg-muted-foreground/50',
  },
  pending_review: {
    label: (d) => d.academy.pendingReview,
    dotClass: 'bg-amber-400',
  },
  reviewed: {
    label: (d) => d.academy.reviewed,
    dotClass: 'bg-green-400',
  },
  needs_improvement: {
    label: (d) => d.academy.needsImprovement,
    dotClass: 'bg-red-400',
  },
}

const CTA_LABEL: Record<ChallengeStatus, (d: Dictionary) => string> = {
  not_started: (d) => d.academy.startChallenge,
  pending_review: (d) => d.academy.continueChallenge,
  reviewed: (d) => d.academy.viewFeedback,
  needs_improvement: (d) => d.academy.continueChallenge,
}

export function ChallengeCard({ challenge, dictionary, locale }: ChallengeCardProps) {
  const difficultyConf = DIFFICULTY_CONFIG[challenge.difficulty]
  const statusConf = STATUS_CONFIG[challenge.userStatus]
  const ctaLabel = CTA_LABEL[challenge.userStatus](dictionary)
  const href = `/${locale}/academy/challenges/${challenge.id}`

  const descriptionExcerpt =
    challenge.description.length > 120
      ? `${challenge.description.slice(0, 120)}…`
      : challenge.description

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      {/* Decorative top glow */}
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-primary/8 blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${difficultyConf.colorClass}`}
          >
            {difficultyConf.label(dictionary)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dotClass}`} />
            {statusConf.label(dictionary)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          {challenge.base_xp_reward} {dictionary.academy.xp}
        </div>
      </div>

      {/* Title & description */}
      <div className="mt-3 flex-1">
        <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {challenge.title}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          {descriptionExcerpt}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground group-hover:shadow-sm"
        >
          {ctaLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
