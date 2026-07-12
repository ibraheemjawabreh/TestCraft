import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormattedDate } from '@/components/ui/formatted-date'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'

interface ReportReviewRow {
  id: string
  title: string
  status: string | null
  severity: string
  createdAt: string | null
  username: string | null
  challengeTitle: string | null
  aiScore: number | null
  earnedXp: number | null
}

function uniqueStrings(values: Array<string | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

export default async function AdminReportsReviewPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('bug_reports')
    .select('id, title, status, reported_severity, created_at, user_id, challenge_id')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(50)

  const reportRows = reports ?? []
  const userIds = uniqueStrings(reportRows.map((report) => report.user_id))
  const challengeIds = uniqueStrings(reportRows.map((report) => report.challenge_id))
  const reportIds = uniqueStrings(reportRows.map((report) => report.id))

  const [profilesResult, challengesResult, evaluationsResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, username').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    challengeIds.length > 0
      ? supabase.from('challenges').select('id, title').in('id', challengeIds)
      : Promise.resolve({ data: [], error: null }),
    reportIds.length > 0
      ? supabase.from('ai_evaluations').select('report_id, ai_score, earned_xp').in('report_id', reportIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const usernamesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.username]),
  )
  const challengeTitlesById = new Map(
    (challengesResult.data ?? []).map((challenge) => [challenge.id, challenge.title]),
  )
  const evaluationsByReportId = new Map(
    (evaluationsResult.data ?? []).map((evaluation) => [evaluation.report_id, evaluation]),
  )

  const rows: ReportReviewRow[] = reportRows.map((report) => {
    const evaluation = evaluationsByReportId.get(report.id)

    return {
      id: report.id,
      title: report.title,
      status: report.status,
      severity: report.reported_severity,
      createdAt: report.created_at,
      username: report.user_id ? usernamesById.get(report.user_id) ?? null : null,
      challengeTitle: report.challenge_id ? challengeTitlesById.get(report.challenge_id) ?? null : null,
      aiScore: evaluation?.ai_score ?? null,
      earnedXp: evaluation?.earned_xp ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.admin.reportsReview}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {dictionary.admin.reportsReviewDescription}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{dictionary.admin.noReportsToReview}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dictionary.admin.dashboard.itemTitle}</TableHead>
                <TableHead>{dictionary.admin.dashboard.user}</TableHead>
                <TableHead>{dictionary.admin.dashboard.challenge}</TableHead>
                <TableHead>{dictionary.admin.dashboard.status}</TableHead>
                <TableHead>{dictionary.admin.dashboard.severity}</TableHead>
                <TableHead>{dictionary.admin.dashboard.score}</TableHead>
                <TableHead>{dictionary.academy.earnedXp}</TableHead>
                <TableHead>{dictionary.admin.dashboard.createdAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>{report.username ?? dictionary.admin.dashboard.noData}</TableCell>
                  <TableCell>{report.challengeTitle ?? dictionary.admin.dashboard.noData}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.status ?? dictionary.admin.dashboard.noData}</Badge>
                  </TableCell>
                  <TableCell>{report.severity}</TableCell>
                  <TableCell>{report.aiScore ?? dictionary.admin.dashboard.noData}</TableCell>
                  <TableCell>{report.earnedXp ?? dictionary.admin.dashboard.noData}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    <FormattedDate value={report.createdAt} locale={locale} fallback={dictionary.admin.dashboard.noData} dateStyle="medium" timeStyle="short" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
