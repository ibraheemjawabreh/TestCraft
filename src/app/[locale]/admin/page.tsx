import { AdminDashboardStats } from '@/components/admin/dashboard/admin-dashboard-stats'
import { AdminQuickActions } from '@/components/admin/dashboard/admin-quick-actions'
import { RecentAiEvaluations } from '@/components/admin/dashboard/recent-ai-evaluations'
import { RecentBugReports } from '@/components/admin/dashboard/recent-bug-reports'
import { RecentUsers } from '@/components/admin/dashboard/recent-users'
import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminDashboardStats } from '@/lib/admin/dashboard'

interface AdminPageProps {
  params: {
    locale: Locale
  }
}

/**
 * Admin Dashboard Overview.
 * The parent layout performs server-side admin authorization before this page renders.
 */
export default async function AdminOverviewPage({ params: { locale } }: AdminPageProps) {
  const dictionary = await getDictionary(locale)
  const result = await getAdminDashboardStats()
  const t = dictionary.admin.dashboard

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {t.title}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      {!result.data ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t.failedToLoad}
        </div>
      ) : (
        <>
          <AdminDashboardStats dictionary={dictionary} stats={result.data.stats} />
          <AdminQuickActions dictionary={dictionary} locale={locale} />
          <div className="grid gap-6">
            <RecentBugReports
              dictionary={dictionary}
              locale={locale}
              reports={result.data.recentBugReports}
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <RecentUsers
                dictionary={dictionary}
                locale={locale}
                users={result.data.recentUsers}
              />
              <RecentAiEvaluations
                dictionary={dictionary}
                locale={locale}
                evaluations={result.data.recentAiEvaluations}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
