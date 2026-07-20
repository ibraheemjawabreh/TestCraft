import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getAdminLabTemplateById } from '@/lib/admin/lab-templates'
import { LabTemplateForm } from '@/components/admin/labs/lab-template-form'
import type { Locale } from '@/i18n/config'

export default async function EditLabTemplatePage({
  params: { id, locale },
}: {
  params: { id: string; locale: Locale }
}) {
  await requireAdmin(locale)

  const { data: labTemplate, error } = await getAdminLabTemplateById(id)

  if (error || !labTemplate) {
    notFound()
  }

  return (
    <div className="mx-auto w-full">
      <LabTemplateForm initialData={labTemplate} locale={locale} />
    </div>
  )
}
