import Image from 'next/image'
import { Award } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedDate } from '@/components/ui/formatted-date'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { TesterActivityBadge } from '@/lib/academy/activity'

interface UserBadgesSectionProps {
  badges: TesterActivityBadge[]
  dictionary: Dictionary
  locale: Locale
}

export function UserBadgesSection({ badges, dictionary, locale }: UserBadgesSectionProps) {
  const activity = dictionary.academy.activity

  return (
    <Card className="border-border/60 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <Award className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          {activity.yourBadges}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
            {activity.noBadges}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {badges.map((badge) => (
              <div key={badge.badgeId} className="rounded-lg border border-border/60 bg-background/45 p-4">
                <div className="flex items-start gap-3">
                  {badge.iconUrl ? (
                    <Image
                      src={badge.iconUrl}
                      alt={badge.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
                      <Award className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{badge.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {badge.description}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <FormattedDate value={badge.earnedAt} locale={locale} fallback="-" dateStyle="medium" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
