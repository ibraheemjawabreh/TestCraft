import Image from 'next/image'
import { Award } from 'lucide-react'
import { AcademyEmptyState } from './academy-empty-state'
import type { Dictionary } from '@/i18n/types'
import type { UserBadgeWithDetails } from '@/lib/academy/badges'
import type { Locale } from '@/i18n/config'

interface BadgesPreviewProps {
  badges: UserBadgeWithDetails[]
  dictionary: Dictionary
  locale: Locale
  title?: string
  emptyMessage?: string
}

export function BadgesPreview({ badges, dictionary, locale, title, emptyMessage }: BadgesPreviewProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {title ?? dictionary.academy.badgesPreview}
        </h2>
      </div>

      {badges.length === 0 ? (
        <AcademyEmptyState
          icon={Award}
          message={emptyMessage ?? dictionary.academy.noBadges}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  alt=""
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
                <p dir="auto" className="text-sm font-semibold text-foreground">{locale === 'ar' && badge.name_ar || badge.name}</p>
                <p dir="auto" className="mt-0.5 text-xs text-muted-foreground">
                  {locale === 'ar' && badge.description_ar || badge.description}
                </p>
                {badge.earned_at && <time dateTime={badge.earned_at} className="mt-1 block text-xs text-muted-foreground">
                  {new Date(badge.earned_at).toLocaleDateString(locale, { dateStyle: 'medium', timeZone: 'UTC' })}
                </time>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
