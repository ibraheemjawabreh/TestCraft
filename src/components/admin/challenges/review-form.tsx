'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Save, Loader2, Clock, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Dictionary } from '@/i18n/types'
import type { AttemptReviewData } from '@/lib/admin/attempt-review'
import type { Locale } from '@/i18n/config'

// Only approved | rejected are valid final decisions
type ReviewDecision = 'approved' | 'rejected'

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

const attemptStatusColors: Record<string, string> = {
  started: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
  submitted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  reviewing: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
}

const attemptStatusLabels: Record<string, string> = {
  started: 'In Progress',
  submitted: 'Submitted',
  reviewing: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
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

  const isTerminal = attempt.status === 'approved' || attempt.status === 'rejected'

  const [decision, setDecision] = useState<ReviewDecision>(
    attempt.status === 'approved' ? 'approved' : 'rejected'
  )
  const [score, setScore] = useState<number>(attempt.score ?? 0)
  const [earnedXp, setEarnedXp] = useState<number>(attempt.earned_xp ?? challenge.base_xp_reward)
  const [isPassed, setIsPassed] = useState<boolean>(attempt.is_passed ?? false)
  const [adminFeedback, setAdminFeedback] = useState<string>(attempt.admin_feedback ?? '')
  const [reportStatuses, setReportStatuses] = useState<Record<string, 'Pending' | 'Reviewed' | 'Rejected'>>(
    Object.fromEntries(reports.map((r) => [r.id, r.status ?? 'Pending']))
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Auto-sync isPassed with decision
  function handleDecisionChange(d: ReviewDecision) {
    setDecision(d)
    setIsPassed(d === 'approved')
    setReportStatuses((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        if (next[k] === 'Pending') {
          next[k] = d === 'approved' ? 'Reviewed' : 'Rejected'
        }
      })
      return next
    })
  }

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
          status: decision,
          score,
          earnedXp,
          adminFeedback,
          isPassed,
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
      {/* Attempt Status Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl px-5 py-4">
        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Attempt Status:</span>
          <Badge variant="outline" className={attemptStatusColors[attempt.status] ?? ''}>
            {attemptStatusLabels[attempt.status] ?? attempt.status}
          </Badge>
          {isTerminal && (
            <span className="text-xs text-muted-foreground">
              · This attempt has been reviewed. You can re-review to update the decision.
            </span>
          )}
          {attempt.time_spent_seconds != null && (
            <span className="text-xs text-muted-foreground">
              · Time spent: {Math.round(attempt.time_spent_seconds / 60)} min
            </span>
          )}
        </div>
      </div>

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
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Decision buttons — only Approve or Reject */}
          <div className="space-y-2">
            <Label>Decision</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={decision === 'approved' ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => handleDecisionChange('approved')}
              >
                <CheckCircle2 className="h-4 w-4" />
                {dict.approve}
              </Button>
              <Button
                variant={decision === 'rejected' ? 'destructive' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => handleDecisionChange('rejected')}
              >
                <XCircle className="h-4 w-4" />
                {dict.reject}
              </Button>
            </div>
          </div>

          {/* Score & XP */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="score">Score (0–100)</Label>
              <input
                id="score"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
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
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* is_passed toggle */}
          <div className="flex items-center gap-3">
            <input
              id="is-passed"
              type="checkbox"
              checked={isPassed}
              onChange={(e) => setIsPassed(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="is-passed" className="cursor-pointer">
              Mark as Passed (unlocks next lesson)
            </Label>
            {decision === 'approved' && !isPassed && (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                Approved but not passed — no unlock
              </span>
            )}
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
