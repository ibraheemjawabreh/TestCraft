import { notFound } from 'next/navigation'
import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminLearningPathById } from '@/lib/admin/learning-paths'
import { LearningPathForm } from '@/components/admin/lessons/learning-path-form'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'

interface EditLearningPathPageProps {
  params: {
    locale: Locale
    id: string
  }
}

export default async function EditLearningPathPage({ params: { locale, id } }: EditLearningPathPageProps) {
  const dictionary = await getDictionary(locale)
  const { data: path, error } = await getAdminLearningPathById(id)

  if (error || !path) {
    notFound()
  }

  // Convert to form values format
  const initialData = {
    id: path.id,
    title_en: path.title_en || '',
    title_ar: path.title_ar || '',
    description_en: path.description_en || '',
    description_ar: path.description_ar || '',
    slug: path.slug,
    is_active: path.is_active,
    sort_order: path.sort_order,
  }

  const isRtl = locale === 'ar'
  const Arrow = isRtl ? ArrowRight : ArrowLeft

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/admin/lessons`}
          className="rounded-lg p-2 transition-colors hover:bg-muted"
        >
          <Arrow className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {dictionary.learning.editPath}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dictionary.learning.pathTitleEn}: {initialData.title_en}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <LearningPathForm
          dictionary={dictionary}
          locale={locale}
          initialData={initialData}
        />
      </div>
    </div>
  )
}
