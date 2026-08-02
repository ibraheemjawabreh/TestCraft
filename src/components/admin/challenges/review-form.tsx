'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Save, Loader2, Clock, AlertTriangle, Calculator } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Dictionary } from '@/i18n/types'
import type { AttemptReviewData, ReportClassificationUpdate } from '@/lib/admin/attempt-review'
import type { Locale } from '@/i18n/config'

type ReviewDecision = 'approved' | 'rejected'
type AdminClassification = 'valid_bug' | 'duplicate' | 'not_a_bug' | 'needs_improvement'

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

export function ReviewForm({ attemptData, locale, dictionary }: ReviewFormProps) {
  const router = useRouter()
  const dict = dictionary.admin.challenges
  const { attempt, tester, challenge, reports, hiddenBugs } = attemptData

  const isTerminal = attempt.status === 'approved' || attempt.status === 'rejected'

  const [decision, setDecision] = useState<ReviewDecision>(
    attempt.status === 'approved' ? 'approved' : 'rejected'
  )
  const [score, setScore] = useState<string>(attempt.score?.toString() ?? '')
  const [isPassed, setIsPassed] = useState<boolean>(attempt.is_passed ?? false)
  const [adminFeedback, setAdminFeedback] = useState<string>(attempt.admin_feedback ?? '')

  // State for each report's review
  const [reportUpdates, setReportUpdates] = useState<Record<string, ReportClassificationUpdate>>(
    Object.fromEntries(
      reports.map((r) => [
        r.id,
        {
          id: r.id,
          status: (r.status as 'Pending' | 'Reviewed' | 'Rejected') ?? 'Pending',
          adminClassification: (r as any).admin_classification ?? 'not_a_bug',
          matchedHiddenBugId: (r as any).matched_hidden_bug_id ?? null,
        },
      ])
    )
  )

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Auto-sync isPassed with decision
  function handleDecisionChange(d: ReviewDecision) {
    setDecision(d)
    setIsPassed(d === 'approved')
  }

  function handleReportUpdate(id: string, update: Partial<ReportClassificationUpdate>) {
    setReportUpdates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...update },
    }))
  }

  // Calculate Auto XP Preview
  const xpPreview = useMemo(() => {
    if (decision !== 'approved') return { baseXp: 0, bugBonusXp: 0, perfectBonus: 0, totalXp: 0 }

    const baseXp = challenge.base_xp_reward ?? 100
    const matchedBugIds = new Set<string>()
    let bugBonusXp = 0

    Object.values(reportUpdates).forEach((update) => {
      if (update.adminClassification === 'valid_bug' && update.matchedHiddenBugId) {
        if (!matchedBugIds.has(update.matchedHiddenBugId)) {
          matchedBugIds.add(update.matchedHiddenBugId)
          const matchedBug = hiddenBugs.find((b) => b.id === update.matchedHiddenBugId)
          bugBonusXp += matchedBug?.bonus_xp ?? 0
        }
      }
    })

    const totalHiddenBugCount = hiddenBugs.length
    const isPerfect = totalHiddenBugCount > 0 && matchedBugIds.size >= totalHiddenBugCount
    const perfectBonus = isPerfect ? 25 : 0
    const totalXp = baseXp + bugBonusXp + perfectBonus

    return { baseXp, bugBonusXp, perfectBonus, totalXp, matchedCount: matchedBugIds.size }
  }, [decision, reportUpdates, challenge.base_xp_reward, hiddenBugs])

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
          score: score === '' ? 0 : Number(score),
          adminFeedback,
          isPassed,
          reportUpdates: Object.values(reportUpdates),
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
          reports.map((report) => {
            const rUpdate = reportUpdates[report.id]
            return (
              <Card key={report.id} className="bg-card/40 backdrop-blur-xl border-border/50 overflow-visible">
                <CardContent className="p-5 space-y-4">
                  {/* Report Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold">{report.title}</p>
                      <Badge variant="outline" className={`mt-1 ${severityColors[report.reported_severity] ?? ''}`}>
                        {report.reported_severity}
                      </Badge>
                    </div>
                  </div>

                  {/* Report Content */}
                  <div className="grid gap-3 sm:grid-cols-3 text-sm border-y border-border/50 py-4 my-2">
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

                  {/* Classification Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="space-y-1 w-full sm:w-auto">
                      <Label className="text-xs text-muted-foreground">Classification</Label>
                      <select
                        className="w-full rounded-md border border-border/70 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={rUpdate.adminClassification ?? 'not_a_bug'}
                        onChange={(e) => handleReportUpdate(report.id, { adminClassification: e.target.value as AdminClassification })}
                      >
                        <option value="valid_bug">Valid Bug (Bonus XP)</option>
                        <option value="duplicate">Duplicate</option>
                        <option value="not_a_bug">Not a Bug</option>
                        <option value="needs_improvement">Needs Improvement</option>
                      </select>
                    </div>

                    {rUpdate.adminClassification === 'valid_bug' && (
                      <div className="space-y-1 w-full flex-1">
                        <Label className="text-xs text-muted-foreground">Match with Intentional Bug</Label>
                        <select
                          className="w-full rounded-md border border-border/70 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={rUpdate.matchedHiddenBugId ?? ''}
                          onChange={(e) => handleReportUpdate(report.id, { matchedHiddenBugId: e.target.value || null })}
                        >
                          <option value="">-- Select matched bug --</option>
                          {hiddenBugs.map((bug) => (
                            <option key={bug.id} value={bug.id}>
                              {bug.bug_title} (+{bug.bonus_xp} XP)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Review Decision */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">{dict.reviewSubmission}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              {/* Decision buttons */}
              <div className="space-y-3">
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

              {/* Score */}
              <div className="space-y-2">
                <Label htmlFor="score">Score (0–100)</Label>
                <input
                  id="score"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* is_passed toggle */}
              <div className="flex items-center gap-3 pt-2">
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
              </div>
              {decision === 'approved' && !isPassed && (
                <p className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Approved but not passed — no unlock
                </p>
              )}
            </div>

            {/* Auto XP Calculation Preview */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">XP Calculation Preview</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Challenge XP:</span>
                  <span className="font-medium">+{xpPreview.baseXp}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Bug Bonus ({xpPreview.matchedCount}/{hiddenBugs.length} unique matched):
                  </span>
                  <span className="font-medium text-emerald-500">+{xpPreview.bugBonusXp}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Perfect Bonus (All bugs matched):</span>
                  <span className="font-medium text-emerald-500">+{xpPreview.perfectBonus}</span>
                </div>
              </div>

              <div className="border-t border-primary/10 pt-3 flex justify-between items-center">
                <span className="font-semibold text-foreground">Total XP to Award:</span>
                <span className="text-xl font-bold text-primary">
                  {decision === 'approved' ? xpPreview.totalXp : 0} XP
                </span>
              </div>

              <p className="text-xs text-muted-foreground italic">
                XP is calculated and awarded automatically when the attempt is approved.
                Re-reviewing will not grant XP twice.
              </p>
            </div>
          </div>

          {/* Admin Feedback */}
          <div className="space-y-2 pt-4">
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
            <p className="text-sm text-rose-500 font-medium">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-emerald-500 font-medium">{dict.reviewSaved}</p>
          )}

          <div className="pt-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
