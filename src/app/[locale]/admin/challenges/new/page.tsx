import NextLink from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { ChallengeForm } from '@/components/admin/challenges/challenge-form'
import { Button } from '@/components/ui/button'
import { getAdminLessons } from '@/lib/admin/lessons'
import { getAdminModules } from '@/lib/admin/modules'
import type { Locale } from '@/i18n/config'

interface NewChallengePageProps {
  params: { locale: Locale }
}

export default async function NewChallengePage({ params: { locale } }: NewChallengePageProps) {
  const dictionary = await getDictionary(locale)
  const [lessonsResult, modulesResult] = await Promise.all([
    getAdminLessons(),
    getAdminModules(),
  ])
  const isRtl = locale === 'ar'

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <NextLink href={`/${locale}/admin/challenges`}>
            {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </NextLink>
        </Button>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {dictionary.admin.challenges.newChallenge}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl rounded-xl border border-border/50 bg-card/40 backdrop-blur-xl p-6 sm:p-8">
        <ChallengeForm
          mode="create"
          lessonOptions={(lessonsResult.data ?? []).map(l => ({
            id: l.id,
            title: locale === 'ar' ? l.title_ar || l.title_en || '' : l.title_en || l.title_ar || '',
            learning_path_title: l.learning_path_title
          }))}
          moduleOptions={(modulesResult.data ?? []).map(m => ({
            id: m.id,
            title: locale === 'ar' ? m.title_ar || m.title_en : m.title_en || m.title_ar || '',
          }))}
          dictionary={dictionary.admin.challenges}
          validationDictionary={dictionary.validation}
          locale={locale}
        />
      </div>
    </div>
  )
}
