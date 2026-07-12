import { notFound } from 'next/navigation'
import NextLink from 'next/link'
import { ArrowLeft, ArrowRight, Users, Clock, CheckCircle2 } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getAdminChallengeById } from '@/lib/admin/challenges'
import { getAdminChallengeSubmissions } from '@/lib/admin/challenge-submissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FormattedDate } from '@/components/ui/formatted-date'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Locale } from '@/i18n/config'

interface SubmissionsPageProps {
  params: {
    locale: Locale
    id: string
  }
}

const statusColors: Record<string, string> = {
  in_progress: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
  submitted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  under_review: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  needs_improvement: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  rejected: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

const statusLabels: Record<string, string> = {
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  needs_improvement: 'Needs Improvement',
  rejected: 'Rejected',
}

export default async function ChallengeSubmissionsPage({
  params: { locale, id },
}: SubmissionsPageProps) {
  await requireAdmin(locale)

  const dictionary = await getDictionary(locale)
  const isRtl = locale === 'ar'
  const dict = dictionary.admin.challenges

  const [{ data: challenge }, { data: submissions }] = await Promise.all([
    getAdminChallengeById(id),
    getAdminChallengeSubmissions(id),
  ])

  if (!challenge) notFound()

  const safeSubmissions = submissions ?? []

  const submittedCount = safeSubmissions.filter((s) =>
    ['submitted', 'under_review'].includes(s.status)
  ).length
  const approvedCount = safeSubmissions.filter((s) => s.status === 'approved').length

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0 mt-1">
            <NextLink href={`/${locale}/admin/challenges/${id}`}>
              {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </NextLink>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{challenge.title}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {dict.submissions}
            </h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{safeSubmissions.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold">{submittedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/40">
        {safeSubmissions.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{dict.noSubmissions}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.tester}</TableHead>
                <TableHead>{dict.reportsCount}</TableHead>
                <TableHead>{dictionary.admin.dashboard.status}</TableHead>
                <TableHead>{dict.finalScore}</TableHead>
                <TableHead>{dict.earnedXp}</TableHead>
                <TableHead>{dict.submittedAt}</TableHead>
                <TableHead>{dict.reviewedAt}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.tester_username}</TableCell>
                  <TableCell>{submission.reports_count}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[submission.status] ?? ''}
                    >
                      {statusLabels[submission.status] ?? submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {submission.final_score !== null
                      ? submission.final_score
                      : dictionary.admin.dashboard.noData}
                  </TableCell>
                  <TableCell>
                    {submission.earned_xp !== null
                      ? submission.earned_xp
                      : dictionary.admin.dashboard.noData}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    <FormattedDate value={submission.submitted_at} locale={locale} fallback={dictionary.admin.dashboard.noData} dateStyle="medium" timeStyle="short" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    <FormattedDate value={submission.reviewed_at} locale={locale} fallback="—" dateStyle="medium" timeStyle="short" />
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <NextLink
                        href={`/${locale}/admin/challenges/${id}/submissions/${submission.id}`}
                      >
                        {dict.reviewSubmission}
                      </NextLink>
                    </Button>
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
