import { ClipboardCheck, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormattedDate } from '@/components/ui/formatted-date'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { TesterActivityAttempt } from '@/lib/academy/activity'

interface ReviewedAttemptsSectionProps {
  attempts: TesterActivityAttempt[]
  dictionary: Dictionary
  locale: Locale
}

const statusConfig = {
  approved: {
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  rejected: {
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    icon: XCircle,
  },
}

export function ReviewedAttemptsSection({ attempts, dictionary, locale }: ReviewedAttemptsSectionProps) {
  const dict = dictionary.admin.challenges

  if (attempts.length === 0) return null

  return (
    <Card className="border-border/60 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Admin Reviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {attempts.map((attempt) => {
            const config = statusConfig[attempt.status as keyof typeof statusConfig]
            const StatusIcon = config?.icon

            return (
              <div
                key={attempt.id}
                className="rounded-lg border border-border/60 bg-background/45 p-4 space-y-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {attempt.challengeTitle ?? 'Unknown Challenge'}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dict.reviewedAt}: <FormattedDate value={attempt.reviewedAt} locale={locale} fallback="-" dateStyle="medium" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {attempt.score !== null && (
                      <span className="text-xs text-muted-foreground">Score: {attempt.score}</span>
                    )}
                    {attempt.earnedXp !== null && (
                      <Badge variant="outline" className="bg-background/60 text-primary border-primary/30">
                        +{attempt.earnedXp} XP
                      </Badge>
                    )}
                    {config && (
                      <Badge variant="outline" className={config.color}>
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {attempt.status === 'approved'
                          ? dictionary.academy.reviewed
                          : 'Rejected'}
                      </Badge>
                    )}
                  </div>
                </div>

                {attempt.adminFeedback && (
                  <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground leading-relaxed">
                    <p className="text-xs font-medium text-foreground mb-1">{dict.adminFeedback}</p>
                    <p>{attempt.adminFeedback}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
