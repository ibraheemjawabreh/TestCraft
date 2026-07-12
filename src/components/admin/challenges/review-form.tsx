'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Dictionary } from '@/i18n/types'
import type { AttemptReviewData } from '@/lib/admin/attempt-review'
import type { Locale } from '@/i18n/config'

type ReviewStatus = 'approved' | 'needs_improvement' | 'rejected'

interface ReviewFormProps {
  attemptData: AttemptReviewData
  locale: Locale
  dictionary: Dictionary
}

const severityColors: Record<string, string> = {
  Low: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  High: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  Critical: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

const reportStatusOptions: Array<{ value: 'Pending' | 'Reviewed' | 'Rejected'; label: string }> = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Reviewed', label: 'Reviewed' },
  { value: 'Rejected', label: 'Rejected' },
]

export function ReviewForm({ attemptData, locale, dictionary }: ReviewFormProps) {
  const router = useRouter()
  const dict = dictionary.admin.challenges
  const { attempt, tester, challenge, reports, hiddenBugs } = attemptData

  const [status, setStatus] = useState<ReviewStatus>(
    attempt.status === 'approved' || attempt.status === 'needs_improvement' || attempt.status === 'rejected'
      ? (attempt.status as ReviewStatus)
      : 'approved'
  )
  const [finalScore, setFinalScore] = useState<number>(attempt.final_score ?? 0)
  const [earnedXp, setEarnedXp] = useState<number>(attempt.earned_xp ?? challenge.base_xp_reward)
  const [adminFeedback, setAdminFeedback] = useState<string>(attempt.admin_feedback ?? '')
  const [reportStatuses, setReportStatuses] = useState<Record<string, 'Pending' | 'Reviewed' | 'Rejected'>>(
    Object.fromEntries(reports.map((r) => [r.id, r.status ?? 'Pending']))
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const isAlreadyReviewed = attempt.xp_awarded

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/${locale}/admin/challenges/api/review-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          challengeId: attempt.challenge_id,
          status,
          finalScore,
          earnedXp,
          adminFeedback,
          reportUpdates: reports.map((r) => ({
            id: r.id,
            status: reportStatuses[r.id] ?? 'Pending',
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error || dict.reviewFailed)
      } else {
        setSaveSuccess(true)
        router.refresh()
      }
    } catch {
      setSaveError(dict.reviewFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Tester + Challenge Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{dict.tester}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">{tester.username}</p>
            <p className="text-sm text-muted-foreground">Level {tester.current_level ?? 1} · {tester.total_xp ?? 0} XP</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{dictionary.admin.dashboard.challenge}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">{challenge.title}</p>
            <p className="text-sm text-muted-foreground">Base XP: {challenge.base_xp_reward}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hidden Bugs Reference (Admin Only) */}
      {hiddenBugs.length > 0 && (
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{dictionary.admin.challenges.hiddenBugs} (Admin Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {hiddenBugs.map((bug, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span>{bug.bug_title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={severityColors[bug.actual_severity] ?? ''}>
                      {bug.actual_severity}
                    </Badge>
                    <span className="text-muted-foreground text-xs">+{bug.bonus_xp ?? 0} XP</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Submitted Reports */}
      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">{dictionary.admin.dashboard.recentBugReports}</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.noSubmissions}</p>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="bg-card/40 backdrop-blur-xl border-border/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{report.title}</p>
                    <Badge variant="outline" className={`mt-1 ${severityColors[report.reported_severity] ?? ''}`}>
                      {report.reported_severity}
                    </Badge>
                  </div>
                  {/* Per-report status override */}
                  <select
                    className="rounded-lg border border-border/70 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={reportStatuses[report.id] ?? 'Pending'}
                    onChange={(e) =>
                      setReportStatuses((prev) => ({
                        ...prev,
                        [report.id]: e.target.value as 'Pending' | 'Reviewed' | 'Rejected',
                      }))
                    }
                  >
                    {reportStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Steps to Reproduce</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{report.steps_to_reproduce}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Expected Result</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{report.expected_result}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Actual Result</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{report.actual_result}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Decision */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">{dict.reviewSubmission}</CardTitle>
          {isAlreadyReviewed && (
            <p className="text-xs text-amber-500">XP has already been awarded for this submission.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status buttons */}
          <div className="space-y-2">
            <Label>Decision</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={status === 'approved' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                  setStatus('approved')
                  setReportStatuses(prev => {
                    const next = { ...prev }
                    Object.keys(next).forEach(k => {
                      if (next[k] === 'Pending') next[k] = 'Reviewed'
                    })
                    return next
                  })
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {dict.approve}
              </Button>
              <Button
                variant={status === 'needs_improvement' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                  setStatus('needs_improvement')
                  setReportStatuses(prev => {
                    const next = { ...prev }
                    Object.keys(next).forEach(k => {
                      if (next[k] === 'Pending') next[k] = 'Rejected'
                    })
                    return next
                  })
                }}
              >
                <AlertCircle className="h-4 w-4" />
                {dict.needsImprovement}
              </Button>
              <Button
                variant={status === 'rejected' ? 'destructive' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                  setStatus('rejected')
                  setReportStatuses(prev => {
                    const next = { ...prev }
                    Object.keys(next).forEach(k => {
                      if (next[k] === 'Pending') next[k] = 'Rejected'
                    })
                    return next
                  })
                }}
              >
                <XCircle className="h-4 w-4" />
                {dict.reject}
              </Button>
            </div>
          </div>

          {/* Score & XP */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="final-score">{dict.finalScore} (0–100)</Label>
              <input
                id="final-score"
                type="number"
                min={0}
                max={100}
                value={finalScore}
                onChange={(e) => setFinalScore(Number(e.target.value))}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="earned-xp">{dict.earnedXp}</Label>
              <input
                id="earned-xp"
                type="number"
                min={0}
                max={10000}
                value={earnedXp}
                onChange={(e) => setEarnedXp(Number(e.target.value))}
                disabled={isAlreadyReviewed}
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isAlreadyReviewed && (
                <p className="text-xs text-muted-foreground">XP already awarded. Cannot change.</p>
              )}
            </div>
          </div>

          {/* Admin Feedback */}
          <div className="space-y-2">
            <Label htmlFor="admin-feedback">{dict.adminFeedback}</Label>
            <Textarea
              id="admin-feedback"
              rows={5}
              value={adminFeedback}
              onChange={(e) => setAdminFeedback(e.target.value)}
              placeholder="Provide detailed feedback for the tester..."
              className="resize-none"
            />
          </div>

          {/* Save */}
          {saveError && (
            <p className="text-sm text-rose-500">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-emerald-500">{dict.reviewSaved}</p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !adminFeedback.trim()}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {dict.saveReview}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
