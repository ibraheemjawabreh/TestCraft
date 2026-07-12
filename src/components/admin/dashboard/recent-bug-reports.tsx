import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormattedDate } from '@/components/ui/formatted-date'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import type { RecentBugReport } from '@/lib/admin/dashboard'

interface RecentBugReportsProps {
  dictionary: Dictionary
  locale: Locale
  reports: RecentBugReport[]
}

export function RecentBugReports({ dictionary, locale, reports }: RecentBugReportsProps) {
  const t = dictionary.admin.dashboard

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{t.recentBugReports}</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noData}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.itemTitle}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.severity}</TableHead>
                <TableHead>{t.user}</TableHead>
                <TableHead>{t.challenge}</TableHead>
                <TableHead>{t.createdAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.status ?? t.noData}</Badge>
                  </TableCell>
                  <TableCell>{report.severity}</TableCell>
                  <TableCell>{report.username ?? t.noData}</TableCell>
                  <TableCell>{report.challengeTitle ?? t.noData}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <FormattedDate value={report.createdAt} locale={locale} fallback={t.noData} dateStyle="medium" timeStyle="short" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
