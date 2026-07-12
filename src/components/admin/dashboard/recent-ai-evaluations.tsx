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
import type { RecentAiEvaluation } from '@/lib/admin/dashboard'

interface RecentAiEvaluationsProps {
  dictionary: Dictionary
  locale: Locale
  evaluations: RecentAiEvaluation[]
}

export function RecentAiEvaluations({
  dictionary,
  locale,
  evaluations,
}: RecentAiEvaluationsProps) {
  const t = dictionary.admin.dashboard

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{t.recentAiEvaluations}</CardTitle>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noData}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.score}</TableHead>
                <TableHead>{t.xp}</TableHead>
                <TableHead>{t.itemTitle}</TableHead>
                <TableHead>{t.evaluatedAt}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell className="font-medium">{evaluation.aiScore}</TableCell>
                  <TableCell>{evaluation.earnedXp}</TableCell>
                  <TableCell>{evaluation.reportTitle ?? t.noData}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <FormattedDate value={evaluation.evaluatedAt} locale={locale} fallback={t.noData} dateStyle="medium" timeStyle="short" />
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
