import { requireAdmin } from '@/lib/auth/require-admin'
import { LabTemplateForm } from '@/components/admin/labs/lab-template-form'
import type { Locale } from '@/i18n/config'

export default async function NewLabTemplatePage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  await requireAdmin(locale)

  return (
    <div className="mx-auto w-full">
      <LabTemplateForm locale={locale} />
    </div>
  )
}
