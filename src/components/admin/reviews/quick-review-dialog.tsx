'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, AlertCircle, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import { fetchAttemptDetails, submitQuickReview } from '@/app/[locale]/admin/reviews/actions'

interface QuickReviewDialogProps {
  locale: Locale
  dictionary: Dictionary
  attemptId: string | null
  challengeId: string | null
  onClose: () => void
}

export function QuickReviewDialog({
  locale,
  dictionary,
  attemptId,
  challengeId,
  onClose,
}: QuickReviewDialogProps) {
  const router = useRouter()
  const t = dictionary.admin.reviews
  const tDash = dictionary.admin.dashboard

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved')
  const [score, setScore] = useState<number>(100)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isTerminal = data?.attempt?.status === 'approved' || data?.attempt?.status === 'rejected'

  useEffect(() => {
    if (attemptId && challengeId) {
      setLoading(true)
      setError(null)
      fetchAttemptDetails(locale, challengeId, attemptId)
        .then((res) => {
          if (res.error || !res.data) {
            setError(res.error || tDash.failedToLoad)
          } else {
            setData(res.data)
            setStatus(res.data.attempt.status === 'rejected' ? 'rejected' : 'approved')
            setScore(res.data.attempt.score ?? 100)
            setFeedback(res.data.attempt.admin_feedback ?? '')
          }
        })
        .catch(() => setError(tDash.failedToLoad))
        .finally(() => setLoading(false))
    }
  }, [attemptId, challengeId, locale, tDash.failedToLoad])

  const handleSubmit = async () => {
    if (!attemptId || !challengeId || !data) return
    if (status !== 'approved' && feedback.trim().length === 0) {
      setError(t.feedbackRequired)
      return
    }

    setSubmitting(true)
    setError(null)

    // For quick review, auto-resolve all pending reports
    const reportUpdates = data.reports.map((r: any) => ({
      id: r.id,
      status: r.status === 'Pending' ? (status === 'approved' ? 'Reviewed' : 'Rejected') : r.status
    }))

    const res = await submitQuickReview(locale, {
      attemptId,
      challengeId,
      status,
      score,
      adminFeedback: feedback,
      isPassed: status === 'approved',
      reportUpdates,
    })

    setSubmitting(false)

    if (res.error) {
      setError(res.error)
    } else {
      router.refresh()
      onClose()
    }
  }

  const isOpen = !!attemptId && !!challengeId

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.quickReview}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error && !data ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold">{t.testerInfo}</h3>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p><strong>{tDash.user}:</strong> {data.tester.username}</p>
                  <p><strong>{tDash.level}:</strong> {data.tester.current_level}</p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">{t.challengeInfo}</h3>
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p><strong>{tDash.challenge}:</strong> {data.challenge.title}</p>
                  <p><strong>{tDash.status}:</strong> <Badge variant="outline">{data.attempt.status}</Badge></p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">{t.submittedReports} ({data.reports.length})</h3>
              <div className="space-y-2">
                {data.reports.map((report: any) => (
                  <div key={report.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="font-medium text-sm">{report.title}</span>
                    <Badge variant={report.status === 'Pending' ? 'secondary' : 'outline'}>
                      {report.status}
                    </Badge>
                  </div>
                ))}
                {data.reports.length === 0 && <p className="text-sm text-muted-foreground">{t.noItems}</p>}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">{t.decision}</h3>
              
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {isTerminal && (
                <div className="rounded-lg bg-secondary/50 p-3 text-sm flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 text-green-500" />
                  This attempt has already been reviewed.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{tDash.status}</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">{t.approve}</SelectItem>
                      <SelectItem value="rejected">{t.reject}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tDash.score}</Label>
                  <Input 
                    type="number" 
                    value={score} 
                    onChange={(e) => setScore(Number(e.target.value))} 
                    min={0} max={100} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.adminFeedback}</Label>
                <Textarea 
                  value={feedback} 
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4} 
                  placeholder={status !== 'approved' ? t.feedbackRequired : ''} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.saveReview}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
