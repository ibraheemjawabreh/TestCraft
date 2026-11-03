import { resolveLocale } from '@/lib/locale'
import { notFound } from 'next/navigation'
import NextLink from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminChallengeById } from '@/lib/admin/challenges'
import { createClient } from '@/lib/supabase/server'
import { PracticalChallengeBuilder } from '@/components/admin/challenges/PracticalChallengeBuilder'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'

interface EditChallengePageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function EditChallengePage({ params }: EditChallengePageProps) {
  const { locale: routeLocale, id } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const isRtl = locale === 'ar'

  const { data: challenge } = await getAdminChallengeById(id)

  if (!challenge) {
    notFound()
  }

  const supabase = await createClient()
  const { data: bugs } = await supabase
    .from('hidden_bugs')
    .select('*')
    .eq('challenge_id', id)

  // Fetch learning paths
  const { data: learningPaths } = await supabase
    .from('learning_paths')
    .select('id, title_en, title_ar')
    .order('sort_order')

  // Fetch modules
  const { data: modules } = await supabase
    .from('learning_modules')
    .select('id, title_en, title_ar')
    .order('sort_order')

  // Fetch lessons with path info
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      id,
      title_en,
      title_ar,
      learning_paths(title_en, title_ar)
    `)
    .order('sort_order')

  const learningPathOptions = (learningPaths || []).map(p => ({
    id: p.id,
    title: locale === 'ar' && p.title_ar ? p.title_ar : p.title_en
  }))

  const moduleOptions = (modules || []).map(m => ({
    id: m.id,
    title: locale === 'ar' && m.title_ar ? m.title_ar : m.title_en
  }))

  const lessonOptions = (lessons || []).map(l => {
    const path = Array.isArray(l.learning_paths) ? l.learning_paths[0] : l.learning_paths
    return {
      id: l.id,
      title: locale === 'ar' && l.title_ar ? l.title_ar : (l.title_en || 'Untitled'),
      learning_path_title: path ? (locale === 'ar' && path.title_ar ? path.title_ar : path.title_en) : null
    }
  })

  const initialData = {
    ...challenge,
    practical_app_key: challenge.practical_app_key || null,
    practical_app_config: challenge.practical_app_config || {},
    embedded_bugs: bugs || [],
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
            Edit Practical Challenge
          </h1>
        </div>
      </div>

      <div className="rounded-xl bg-card/40 backdrop-blur-xl">
        <PracticalChallengeBuilder
          dictionary={dictionary}
          locale={locale}
          initialData={initialData as any}
          challengeId={id}
          learningPathOptions={learningPathOptions}
          moduleOptions={moduleOptions}
          lessonOptions={lessonOptions}
        />
      </div>
    </div>
  )
}
