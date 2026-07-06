import Image from 'next/image'
import { Award } from 'lucide-react'
import { AcademyEmptyState } from './academy-empty-state'
import type { Dictionary } from '@/i18n/types'
import type { UserBadgeWithDetails } from '@/lib/academy/badges'

interface BadgesPreviewProps {
  badges: UserBadgeWithDetails[]
  dictionary: Dictionary
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function BadgesPreview({ badges, dictionary }: BadgesPreviewProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {dictionary.academy.badgesPreview}
        </h2>
      </div>

      {badges.length === 0 ? (
        <AcademyEmptyState
          icon={Award}
          message={dictionary.academy.noBadges}
        />
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((badge) => (
            <div
              key={badge.badge_id}
              className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border border-border/50 bg-card/60 p-4 text-center backdrop-blur-xl transition-all hover:border-yellow-500/30 hover:shadow-sm"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-yellow-500/3 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {badge.icon_url ? (
                <Image
                  src={badge.icon_url}
                  alt={badge.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <Award className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{badge.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {badge.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {formatDate(badge.earned_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
