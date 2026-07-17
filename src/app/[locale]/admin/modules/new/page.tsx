import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { getAdminLearningPaths } from '@/lib/admin/learning-paths'
import { ModuleForm } from '@/components/admin/modules/module-form'

export default async function AdminNewModulePage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const pathsResult = await getAdminLearningPaths()
  const paths = pathsResult.data ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          Create Module
        </h1>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
        {paths.length === 0 ? (
          <p className="text-sm text-muted-foreground">No learning paths available. Create a learning path first.</p>
        ) : (
          <ModuleForm paths={paths} locale={locale} />
        )}
      </div>
    </div>
  )
}
