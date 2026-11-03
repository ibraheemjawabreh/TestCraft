import { resolveLocale } from '@/lib/locale'
import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminLabTemplates } from '@/lib/admin/lab-templates'
import { LabsTable } from '@/components/admin/labs/labs-table'
import type { Locale } from '@/i18n/config'

interface AdminLabsPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function AdminLabsPage({ params }: AdminLabsPageProps) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)
  const { data: labs } = await getAdminLabTemplates()

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {/* @ts-expect-error Dictionary type might not have labs yet */}
          {dictionary.admin.nav.labs || 'Labs'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage interactive lab templates used in challenges.
        </p>
      </div>

      <LabsTable labs={labs ?? []} locale={locale} />
    </div>
  )
}
