import { notFound } from 'next/navigation'
import NextLink from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminChallengeById } from '@/lib/admin/challenges'
import { getAdminLessons } from '@/lib/admin/lessons'
import { ChallengeForm } from '@/components/admin/challenges/challenge-form'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'

interface EditChallengePageProps {
  params: {
    locale: Locale
    id: string
  }
}

export default async function EditChallengePage({ params: { locale, id } }: EditChallengePageProps) {
  const dictionary = await getDictionary(locale)
  const isRtl = locale === 'ar'

  const [{ data: challenge }, lessonsResult] = await Promise.all([
    getAdminChallengeById(id),
    getAdminLessons(),
  ])

  if (!challenge) {
    notFound()
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <NextLink href={`/${locale}/admin/challenges/${id}`}>
            {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </NextLink>
        </Button>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {dictionary.admin.challenges.editChallenge}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl p-6 sm:p-8">
        <ChallengeForm
          mode="edit"
          challenge={challenge}
          lessonOptions={(lessonsResult.data ?? []).map(l => ({
            id: l.id,
            title: locale === 'ar' ? l.title_ar || l.title_en || '' : l.title_en || l.title_ar || '',
            learning_path_title: l.learning_path_title
          }))}
          dictionary={dictionary.admin.challenges}
          validationDictionary={dictionary.validation}
          locale={locale}
        />
      </div>
    </div>
  )
}
