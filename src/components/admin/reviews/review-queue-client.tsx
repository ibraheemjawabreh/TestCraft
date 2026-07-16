'use client'

import { useState } from 'react'
import { Eye, Zap } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormattedDate } from '@/components/ui/formatted-date'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { ReviewQueueItem } from '@/lib/admin/reviews'
import { QuickReviewDialog } from '@/components/admin/reviews/quick-review-dialog'

interface ReviewQueueClientProps {
  items: ReviewQueueItem[]
  dictionary: Dictionary
  locale: Locale
}

export function ReviewQueueClient({ items, dictionary, locale }: ReviewQueueClientProps) {
  const t = dictionary.admin.reviews

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null)


  return (
    <>
      <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.tester}</TableHead>
              <TableHead>{t.challenge}</TableHead>
              <TableHead>{t.status}</TableHead>
              <TableHead>{t.reportsCount}</TableHead>
              <TableHead>{t.submittedAt}</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t.noItems}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.testerUsername}</TableCell>
                  <TableCell>{item.challengeTitle}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : item.status === 'rejected'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : item.status === 'reviewing'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : item.status === 'submitted'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30'
                      }
                    >
                      {item.status === 'started' ? 'In Progress'
                        : item.status === 'submitted' ? 'Submitted'
                        : item.status === 'reviewing' ? 'Under Review'
                        : item.status === 'approved' ? 'Approved'
                        : item.status === 'rejected' ? 'Rejected'
                        : item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.reportsCount}</TableCell>
                  <TableCell>
                    {item.submittedAt ? (
                      <FormattedDate value={item.submittedAt} locale={locale} dateStyle="medium" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => {
                        setSelectedAttemptId(item.id)
                        setSelectedChallengeId(item.challengeId)
                      }}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4 text-primary" />
                      {t.quickReview}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <QuickReviewDialog
        locale={locale}
        dictionary={dictionary}
        attemptId={selectedAttemptId}
        challengeId={selectedChallengeId}
        onClose={() => {
          setSelectedAttemptId(null)
          setSelectedChallengeId(null)
        }}
      />
    </>
  )
}
