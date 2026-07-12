import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import { AcademyEmptyState } from './academy-empty-state'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ReportWithChallengeTitle } from '@/lib/academy/academy'
import type { Database } from '@/types/database.types'
import { FormattedDate } from '@/components/ui/formatted-date'

type SeverityLevel = Database['public']['Enums']['severity_level']
type ReportStatus = Database['public']['Enums']['report_status']

interface RecentReportsProps {
  reports: ReportWithChallengeTitle[]
  dictionary: Dictionary
  locale: Locale
}

const SEVERITY_STYLE: Record<SeverityLevel, string> = {
  Low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  High: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  Pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Reviewed: 'text-green-400 bg-green-500/10 border-green-500/20',
  Rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function RecentReports({ reports, dictionary, locale }: RecentReportsProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {dictionary.academy.recentReports}
        </h2>
        <Link
          href={`/${locale}/academy/reports`}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {dictionary.academy.viewReports}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {reports.length === 0 ? (
        <AcademyEmptyState
          icon={FileText}
          message={dictionary.academy.noReports}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl">
          <div className="divide-y divide-border/50">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {report.title}
                  </p>
                  {report.challenge_title && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {report.challenge_title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[report.reported_severity]}`}
                  >
                    {dictionary.academy[report.reported_severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical']}
                  </span>
                  {report.status && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[report.status]}`}
                    >
                      {report.status === 'Pending'
                        ? dictionary.academy.pendingReview
                        : report.status === 'Reviewed'
                        ? dictionary.academy.reviewed
                        : dictionary.academy.rejectedReports}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    <FormattedDate value={report.created_at} locale={locale} fallback="-" dateStyle="medium" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
