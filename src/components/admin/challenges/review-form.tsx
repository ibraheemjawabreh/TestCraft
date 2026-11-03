'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  Clock,
  AlertTriangle,
  Calculator,
  Bug,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Dictionary } from '@/i18n/types'
import type { AttemptReviewData, ReportClassificationUpdate } from '@/lib/admin/attempt-review'
import type { Locale } from '@/i18n/config'

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

export function ReviewForm({ attemptData, locale, dictionary }: ReviewFormProps) {
  const router = useRouter()
  const dict = dictionary.admin.challenges
  const attemptStatusLabels:Record<string,string>={started:dictionary.factory.status.running,submitted:dictionary.factory.reviewUI.submitted,reviewing:dictionary.factory.reviewUI.reviewing,approved:dictionary.factory.status.approved,rejected:dictionary.factory.reject}
  const { attempt, tester, challenge, reports, hiddenBugs } = attemptData

  const isTerminal = attempt.status === 'approved' || attempt.status === 'rejected'

  const [decision, setDecision] = useState<ReviewDecision>(
    attempt.status === 'approved' ? 'approved' : 'rejected'
  )
  const [isPassed, setIsPassed] = useState<boolean>(attempt.is_passed ?? false)
  const [adminFeedback, setAdminFeedback] = useState<string>(attempt.admin_feedback ?? '')

  // ── Hidden Bugs checklist ──────────────────────────────────────
  // Tracks which hidden bugs have been confirmed as found by the tester.
  const [checkedBugIds, setCheckedBugIds] = useState<Set<string>>(() => {
    if (attemptData.awardedBugIds && attemptData.awardedBugIds.length > 0) {
      return new Set(attemptData.awardedBugIds)
    }

    // Fallback to legacy matched reports if no XP tx found
    const preChecked = new Set<string>()
    reports.forEach((r) => {
      const matchedId = (r as any).matched_hidden_bug_id
      if (matchedId) preChecked.add(matchedId)
    })
    return preChecked
  })

  // ── Report classification state (still tracked for DB update) ──
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

  // Toggle a hidden bug's found status
  function toggleBugFound(bugId: string) {
    setCheckedBugIds((prev) => {
      const next = new Set(prev)
      if (next.has(bugId)) {
        next.delete(bugId)
      } else {
        next.add(bugId)
      }
      return next
    })
  }

  // XP Preview calculation
  const xpPreview = useMemo(() => {
    if (decision !== 'approved') return { baseXp: 0, bugBonusXp: 0, perfectBonus: 0, totalXp: 0, matchedCount: 0 }

    const baseXp = challenge.base_xp_reward ?? 100
    let bugBonusXp = 0

    checkedBugIds.forEach((bugId) => {
      const bug = hiddenBugs.find((b) => b.id === bugId)
      bugBonusXp += bug?.bonus_xp ?? 0
    })

    const isPerfect = hiddenBugs.length > 0 && checkedBugIds.size >= hiddenBugs.length
    const perfectBonus = isPerfect ? 25 : 0
    const totalXp = baseXp + bugBonusXp + perfectBonus

    return { baseXp, bugBonusXp, perfectBonus, totalXp, matchedCount: checkedBugIds.size }
  }, [decision, checkedBugIds, challenge.base_xp_reward, hiddenBugs])

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
          adminFeedback,
          isPassed,
          reportUpdates: Object.values(reportUpdates),
          foundHiddenBugIds: Array.from(checkedBugIds),
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
          <span className="text-sm font-medium text-muted-foreground">{dictionary.factory.reviewUI.attemptStatus}</span>
          <Badge variant="outline" className={attemptStatusColors[attempt.status] ?? ''}>
            {attemptStatusLabels[attempt.status] ?? attempt.status}
          </Badge>
          {isTerminal && (
            <span className="text-xs text-muted-foreground">
              {dictionary.factory.reviewUI.reviewedHint}</span>
          )}
          {attempt.time_spent_seconds != null && (
            <span className="text-xs text-muted-foreground">
              {dictionary.factory.reviewUI.time}{Math.round(attempt.time_spent_seconds / 60)} {dictionary.factory.reviewUI.minutes}</span>
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
            <p className="text-sm text-muted-foreground">{dictionary.factory.reviewUI.level}{tester.current_level ?? 1} · {tester.total_xp ?? 0} {dictionary.factory.reviewUI.xp}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{dictionary.admin.dashboard.challenge}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">{challenge.title}</p>
            <p className="text-sm text-muted-foreground">{dictionary.factory.reviewUI.baseXp}{challenge.base_xp_reward}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 1: Hidden Bugs Checklist ── */}
      {hiddenBugs.length > 0 && (
        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {dictionary.factory.reviewUI.checklist}<span className="ml-2 text-sm font-normal text-muted-foreground">
                  {dictionary.factory.reviewUI.checkHint}</span>
              </CardTitle>
            </div>
            {attempt.xp_awarded && (
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                {dictionary.factory.reviewUI.alreadyAwarded}</p>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {hiddenBugs.map((bug) => {
                const isChecked = checkedBugIds.has(bug.id)
                return (
                  <li key={bug.id}>
                    <button
                      type="button"
                      disabled={attempt.xp_awarded}
                      onClick={() => toggleBugFound(bug.id)}
                      className={`w-full flex items-center gap-3 rounded-lg border p-4 text-left transition-all duration-150
                        ${isChecked
                          ? 'border-emerald-500/50 bg-emerald-500/8 dark:bg-emerald-500/10'
                          : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                        }
                        ${attempt.xp_awarded ? 'opacity-70 cursor-not-allowed' : ''}
                      `}
                    >
                      <span className="shrink-0 text-muted-foreground">
                        {isChecked
                          ? <CheckSquare className="h-5 w-5 text-emerald-500" />
                          : <Square className="h-5 w-5" />
                        }
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isChecked ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                          {bug.bug_title}
                        </p>
                        {bug.bug_key && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{bug.bug_key}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={severityColors[bug.actual_severity] ?? ''}>
                          {bug.actual_severity}
                        </Badge>
                        <span className={`text-xs font-semibold ${isChecked ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          +{bug.bonus_xp ?? 0} {dictionary.factory.reviewUI.xp}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Progress summary */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground border-t border-border/50 pt-4">
              <span className="font-medium text-foreground">{checkedBugIds.size}</span>
              <span>/ {hiddenBugs.length} {dictionary.factory.reviewUI.bugsFound}</span>
              {checkedBugIds.size === hiddenBugs.length && hiddenBugs.length > 0 && (
                <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {dictionary.factory.reviewUI.perfect}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 2: Submitted Bug Reports (read-only reference) ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold">
            {dictionary.admin.dashboard.recentBugReports}
          </h2>
          <Badge variant="outline" className="text-xs">
            {reports.length} {dictionary.factory.reviewUI.reports}</Badge>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.noSubmissions}</p>
        ) : (
          reports.map((report, idx) => (
            <Card key={report.id} className="bg-card/40 backdrop-blur-xl border-border/50">
              <CardContent className="p-5 space-y-3">
                {/* Report Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm">
                      <span className="text-muted-foreground mr-2">#{idx + 1}</span>
                      {report.title}
                    </p>
                    <Badge variant="outline" className={`mt-1 ${severityColors[report.reported_severity] ?? ''}`}>
                      {report.reported_severity}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">{dictionary.factory.reviewUI.classification}
                    <select aria-label={locale === 'ar' ? 'تصنيف البلاغ' : 'Report classification'} className="w-full rounded-lg border bg-background p-2"
                      value={reportUpdates[report.id]?.adminClassification || 'not_a_bug'}
                      onChange={e => setReportUpdates(prev => ({...prev,[report.id]:{...prev[report.id],adminClassification:e.target.value as ReportClassificationUpdate['adminClassification']}}))}>
                      {['valid_bug','duplicate','not_a_bug','needs_improvement'].map(k => <option key={k} value={k}>{({valid_bug:dictionary.factory.reviewUI.valid,duplicate:dictionary.factory.reviewUI.duplicate,not_a_bug:dictionary.factory.reviewUI.notBug,needs_improvement:dictionary.factory.reviewUI.improve})[k]}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">{dictionary.factory.reviewFeedback}
                    <textarea aria-label={dictionary.factory.reviewFeedback} className="w-full rounded-lg border bg-background p-2"
                      value={reportUpdates[report.id]?.feedback || ''}
                      onChange={e => setReportUpdates(prev=>({...prev,[report.id]:{...prev[report.id],feedback:e.target.value}}))}/>
                  </label>
                </div>
                {/* Report Content */}
                <div className="grid gap-3 sm:grid-cols-3 text-sm border-y border-border/50 py-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{dictionary.factory.reviewUI.steps}</p>
                    <p className="whitespace-pre-wrap leading-relaxed text-xs">{report.steps_to_reproduce}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{dictionary.factory.reviewUI.expected}</p>
                    <p className="whitespace-pre-wrap leading-relaxed text-xs">{report.expected_result}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{dictionary.factory.reviewUI.actual}</p>
                    <p className="whitespace-pre-wrap leading-relaxed text-xs">{report.actual_result}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── SECTION 3: Review Decision ── */}
      <Card className="bg-card/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base">{dict.reviewSubmission}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              {/* Decision buttons */}
              <div className="space-y-3">
                <Label>{dictionary.factory.reviewUI.decision}</Label>
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
                  {dictionary.factory.reviewUI.passed}</Label>
              </div>
              {decision === 'approved' && !isPassed && (
                <p className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {dictionary.factory.reviewUI.notPassed}</p>
              )}
            </div>

            {/* Auto XP Calculation Preview */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">{dictionary.factory.reviewUI.preview}</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{dictionary.factory.reviewUI.base}</span>
                  <span className="font-medium">+{xpPreview.baseXp}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {dictionary.factory.reviewUI.bugBonus}{xpPreview.matchedCount}/{hiddenBugs.length} {dictionary.factory.reviewUI.bugsSuffix}</span>
                  <span className="font-medium text-emerald-500">+{xpPreview.bugBonusXp}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{dictionary.factory.reviewUI.perfectBonus}</span>
                  <span className="font-medium text-emerald-500">+{xpPreview.perfectBonus}</span>
                </div>
              </div>

              <div className="border-t border-primary/10 pt-3 flex justify-between items-center">
                <span className="font-semibold text-foreground">{dictionary.factory.reviewUI.total}</span>
                <span className="text-xl font-bold text-primary">
                  {decision === 'approved' ? xpPreview.totalXp : 0} {dictionary.factory.reviewUI.xp}</span>
              </div>

              <p className="text-xs text-muted-foreground italic">
                {dictionary.factory.reviewUI.rewardHint}</p>
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
              placeholder={dictionary.factory.reviewUI.feedbackPlaceholder}
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
