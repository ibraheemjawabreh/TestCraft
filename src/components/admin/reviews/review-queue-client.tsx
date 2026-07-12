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

  const handleQuickReview = (attemptId: string) => {
    // Implemented via state setting below
  }

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
                    <Badge variant={
                      item.status === 'approved' ? 'default' : 
                      item.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {item.status}
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
