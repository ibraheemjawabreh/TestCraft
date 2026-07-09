import { FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { TesterActivityReport } from '@/lib/academy/activity'

interface RecentReportsSectionProps {
  reports: TesterActivityReport[]
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

export function RecentReportsSection({ reports, dictionary, locale }: RecentReportsSectionProps) {
  const activity = dictionary.academy.activity

  return (
    <Card className="border-border/60 bg-card/75 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-xl">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          {activity.recentReports}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
            {activity.noRecentReports}
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-border/60 bg-background/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{report.title}</h3>
                    {report.challengeTitle && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{report.challengeTitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(report.createdAt, locale)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-background/60">
                    {activity.severity}: {dictionary.academy[report.reportedSeverity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical']}
                  </Badge>
                  {report.status && (
                    <Badge variant="outline" className="bg-background/60">
                      {activity.status}:{' '}
                      {report.status === 'Pending'
                        ? dictionary.academy.pendingReview
                        : report.status === 'Reviewed'
                          ? dictionary.academy.reviewed
                          : dictionary.academy.needsImprovement}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
