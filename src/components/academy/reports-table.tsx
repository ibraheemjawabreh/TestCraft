'use client'

import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { ReportWithChallenge } from '@/lib/academy/reports'
import type { Database } from '@/types/database.types'
import type { Locale } from '@/i18n/config'
import { FormattedDate } from '@/components/ui/formatted-date'

type SeverityLevel = Database['public']['Enums']['severity_level']
type ReportStatus = Database['public']['Enums']['report_status']

interface ReportsTableProps {
  reports: ReportWithChallenge[]
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

export function ReportsTable({ reports, dictionary, locale }: ReportsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  const filtered = useMemo(() => {
    let result = [...reports]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.challenge_title ?? '').toLowerCase().includes(q),
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    if (severityFilter !== 'all') {
      result = result.filter((r) => r.reported_severity === severityFilter)
    }

    result.sort((a, b) => {
      const aDate = new Date(a.created_at ?? 0).getTime()
      const bDate = new Date(b.created_at ?? 0).getTime()
      return sortOrder === 'newest' ? bDate - aDate : aDate - bDate
    })

    return result
  }, [reports, search, statusFilter, severityFilter, sortOrder])

  const selectClass =
    'rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dictionary.academy.searchPlaceholder}
            className="block w-full rounded-lg border border-border/60 bg-background/60 py-2 ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
            className={selectClass}
            aria-label={dictionary.academy.filterByStatus}
          >
            <option value="all">{dictionary.academy.allStatuses}</option>
            <option value="Pending">{dictionary.academy.pendingReview}</option>
            <option value="Reviewed">{dictionary.academy.reviewed}</option>
            <option value="Rejected">{dictionary.academy.needsImprovement}</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | 'all')}
            className={selectClass}
            aria-label={dictionary.academy.filterBySeverity}
          >
            <option value="all">{dictionary.academy.allSeverities}</option>
            <option value="Low">{dictionary.academy.low}</option>
            <option value="Medium">{dictionary.academy.medium}</option>
            <option value="High">{dictionary.academy.high}</option>
            <option value="Critical">{dictionary.academy.critical}</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className={selectClass}
            aria-label={dictionary.academy.sortBy}
          >
            <option value="newest">{dictionary.academy.sortNewest}</option>
            <option value="oldest">{dictionary.academy.sortOldest}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/30 py-12 text-center">
          <p className="text-sm text-muted-foreground">{dictionary.academy.noReports}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/20">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {dictionary.academy.reportTitle}
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {dictionary.academy.challenge}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {dictionary.academy.severity}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {dictionary.academy.status}
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {dictionary.academy.createdAt}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <span className="block font-medium text-foreground truncate">
                        {report.title}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3.5 text-muted-foreground max-w-[160px]">
                      <span className="block truncate">
                        {report.challenge_title ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[report.reported_severity]}`}
                      >
                        {dictionary.academy[report.reported_severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical']}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
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
                    </td>
                    <td className="hidden md:table-cell px-4 py-3.5 text-muted-foreground text-xs">
                      <FormattedDate value={report.created_at} locale={locale} fallback="-" dateStyle="medium" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Count */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} / {reports.length} {dictionary.academy.report}
        </p>
      )}
    </div>
  )
}
