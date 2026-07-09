import { Bot, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { TesterActivityAiFeedback } from '@/lib/academy/activity'

interface RecentAiFeedbackSectionProps {
  feedback: TesterActivityAiFeedback[]
  dictionary: Dictionary
  locale: Locale
}

function formatDate(value: string | null, locale: Locale): string {
  if (!value) return '-'

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function excerpt(value: string): string {
  return value.length > 180 ? `${value.slice(0, 180)}...` : value
}

export function RecentAiFeedbackSection({
  feedback,
  dictionary,
  locale,
}: RecentAiFeedbackSectionProps) {
  const activity = dictionary.academy.activity

  return (
    <Card className="border-border/60 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <Bot className="h-5 w-5 text-cyan-500" aria-hidden="true" />
          {activity.recentAiFeedback}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedback.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
            {activity.noAiFeedback}
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/60 bg-background/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {item.reportTitle && (
                      <h3 className="truncate text-sm font-semibold text-foreground">{item.reportTitle}</h3>
                    )}
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {excerpt(item.feedback)}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/10">
                    {activity.aiScore}: {item.aiScore}%
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    {activity.earnedXp}: {item.earnedXp}
                  </span>
                  <span>{activity.evaluatedAt}: {formatDate(item.evaluatedAt, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
