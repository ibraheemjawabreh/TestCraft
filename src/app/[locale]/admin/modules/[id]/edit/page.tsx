import { redirect } from 'next/navigation'
import { type Locale } from '@/i18n/config'
import { getAdminModule } from '@/lib/admin/modules'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { ModuleForm } from '@/components/admin/modules/module-form'

export default async function AdminEditModulePage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string }
}) {
  const [moduleResult, pathsResult] = await Promise.all([
    getAdminModule(id),
    getAdminLearningPaths(),
  ])

  if (!moduleResult.data) {
    redirect(`/${locale}/admin/modules`)
  }

  const mod = moduleResult.data
  const paths = pathsResult.data ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Edit Module
        </h1>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
        <ModuleForm
          paths={paths}
          locale={locale}
          initialData={{
            id: mod.id,
            learning_path_id: mod.learning_path_id,
            title_en: mod.title_en || '',
            title_ar: mod.title_ar || '',
            slug: mod.slug,
            description_en: mod.description_en || '',
            description_ar: mod.description_ar || '',
            sort_order: mod.sort_order,
            is_published: mod.is_published,
          }}
        />
      </div>
    </div>
  )
}
