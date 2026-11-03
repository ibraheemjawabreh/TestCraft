import { resolveLocale } from '@/lib/locale'
import { requireAdmin } from '@/lib/auth/require-admin'
import { LabTemplateForm } from '@/components/admin/labs/lab-template-form'
import type { Locale } from '@/i18n/config'

export default async function NewLabTemplatePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  await requireAdmin(locale)

  return (
    <div className="mx-auto w-full">
      <LabTemplateForm locale={locale} />
    </div>
  )
}
