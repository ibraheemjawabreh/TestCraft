import { getAdminReviewQueue } from '@/lib/admin/reviews'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { ReviewQueueClient } from '@/components/admin/reviews/review-queue-client'
import { ClipboardCheck } from 'lucide-react'

interface AdminReviewsPageProps {
  params: {
    locale: Locale
  }
}

export default async function AdminReviewsPage({ params: { locale } }: AdminReviewsPageProps) {
  const dictionary = await getDictionary(locale)
  const result = await getAdminReviewQueue()
  const t = dictionary.admin.reviews

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          {t.title}
        </h1>
        <p className="mt-2 text-lg max-w-3xl text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      {!result.data ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      ) : (
        <ReviewQueueClient items={result.data} dictionary={dictionary} locale={locale} />
      )}
    </div>
  )
}
