import { resolveLocale } from '@/lib/locale'
import { requireAdmin } from '@/lib/auth/require-admin'
import { ImportCurriculum } from '@/components/admin/curriculum/import-curriculum'
import { getDictionary } from '@/i18n/get-dictionary'
import { getCurriculumTree } from '@/lib/admin/curriculum'
import { CurriculumWorkspace } from '@/components/admin/curriculum/curriculum-workspace'
import { CurriculumSetupNotice } from '@/components/admin/curriculum/curriculum-setup-notice'
import type { Locale } from '@/i18n/config'

export default async function CurriculumPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  await requireAdmin(locale)
  const dictionary = await getDictionary(locale)
  const { data, error } = await getCurriculumTree()

  if (error || !data) {
    return (
      <div className="p-8 text-center text-destructive">
        <ImportCurriculum locale={locale} ready={false} />
        <p>{dictionary.factory.failed}: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.curriculum?.title || 'Learning Management'}
        </h1>
        <p className="text-muted-foreground">
          {locale === 'ar' ? 'إدارة المسارات والوحدات والدروس باللغتين.' : 'Manage bilingual paths, modules, and lessons.'}
        </p>
      </div>

      {data.requiresMigration && <CurriculumSetupNotice locale={locale} />}
      <ImportCurriculum locale={locale} ready={!data.requiresMigration} />

      <CurriculumWorkspace
        paths={data.paths}
        stats={data.stats}
        dictionary={dictionary}
        locale={locale}
        readOnly={data.requiresMigration}
      />
    </div>
  )
}
