import NextLink from 'next/link'
import { Plus, Edit } from 'lucide-react'
import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminModules } from '@/lib/admin/modules'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n/config'

export default async function AdminModulesPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)
  const result = await getAdminModules()
  const modules = result.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Modules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your learning modules across all learning paths.
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <NextLink href={`/${locale}/admin/modules/new`}>
            <Plus className="h-4 w-4" />
            Create Module
          </NextLink>
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <p className="text-base font-medium text-foreground">No modules found</p>
            <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new module.</p>
            <Button asChild variant="outline" className="mt-4 gap-2">
              <NextLink href={`/${locale}/admin/modules/new`}>
                <Plus className="h-4 w-4" />
                Create Module
              </NextLink>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="border-b border-border/50 bg-muted/50 text-xs uppercase text-foreground/80">
                <tr>
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Learning Path</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {modules.map((mod) => (
                  <tr key={mod.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {locale === 'ar' ? mod.title_ar || mod.title_en : mod.title_en || mod.title_ar}
                    </td>
                    <td className="px-6 py-4">
                      {mod.learning_paths
                        ? locale === 'ar'
                          ? mod.learning_paths.title_ar || mod.learning_paths.title_en
                          : mod.learning_paths.title_en || mod.learning_paths.title_ar
                        : 'No Path'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          mod.is_published
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {mod.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground/80">{mod.sort_order}</td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="gap-2">
                        <NextLink href={`/${locale}/admin/modules/${mod.id}/edit`}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </NextLink>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
