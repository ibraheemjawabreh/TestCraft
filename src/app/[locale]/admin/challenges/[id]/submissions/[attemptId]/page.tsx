import { resolveLocale } from '@/lib/locale'
import { notFound } from 'next/navigation'
import NextLink from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getAdminAttemptReview } from '@/lib/admin/attempt-review'
import { ReviewForm } from '@/components/admin/challenges/review-form'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'

interface ReviewPageProps {
  params: Promise<{
    locale: string
    id: string
    attemptId: string
  }>
}

export default async function ChallengeAttemptReviewPage({
  params,
}: ReviewPageProps) {
  const { locale: routeLocale, id, attemptId } = await params
  const locale = resolveLocale(routeLocale)

  await requireAdmin(locale)

  const dictionary = await getDictionary(locale)
  const isRtl = locale === 'ar'
  const dict = dictionary.admin.challenges

  const { data: attemptData, error } = await getAdminAttemptReview(id, attemptId)

  if (error || !attemptData) notFound()

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
          <NextLink href={`/${locale}/admin/challenges/${id}/submissions`}>
            {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </NextLink>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground mb-0.5">
            {attemptData.challenge.title} · {attemptData.tester.username}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {dict.reviewSubmission}
          </h1>
        </div>
      </div>

      <ReviewForm
        attemptData={attemptData}
        locale={locale}
        dictionary={dictionary}
      />
    </div>
  )
}
