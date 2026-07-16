import Link from 'next/link'
import { ArrowRight, ClipboardCheck } from 'lucide-react'

import { AdminSystemOverview } from '@/components/admin/dashboard/admin-system-overview'
import { AdminQuickActions } from '@/components/admin/dashboard/admin-quick-actions'
import { RecentBugReports } from '@/components/admin/dashboard/recent-bug-reports'
import { RecentUsers } from '@/components/admin/dashboard/recent-users'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { getAdminDashboardOverview } from '@/lib/admin/dashboard'

interface AdminPageProps {
  params: {
    locale: Locale
  }
}

/**
 * Admin Command Center (Dashboard Overview).
 */
export default async function AdminOverviewPage({ params: { locale } }: AdminPageProps) {
  const dictionary = await getDictionary(locale)
  const result = await getAdminDashboardOverview()
  const t = dictionary.admin.dashboard

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="admin-page-heading rounded-2xl p-6 sm:p-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          {t.title}
        </h1>
        <p className="mt-2 text-lg max-w-3xl text-muted-foreground">
          {t.subtitle}
        </p>
      </div>

      {!result.data ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t.failedToLoad}
        </div>
      ) : (
        <>
          {/* Priority Review CTA */}
          {(result.data.stats.pendingReviews > 0 || result.data.stats.pendingReports > 0) && (
            <Card className="border-[#f97316]/25 bg-[#f97316]/5 shadow-[0_18px_45px_-35px_rgba(234,88,12,0.45)]">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-[#f97316]/15 p-3">
                    <ClipboardCheck className="h-6 w-6 text-[#ea580c]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{t.pendingReviews}</h3>
                    <p className="text-sm text-muted-foreground">
                      {result.data.stats.pendingReviews} {t.pendingReviews.toLowerCase()} • {result.data.stats.pendingReports} {t.pendingReports.toLowerCase()}
                    </p>
                  </div>
                </div>
                <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                  <Link href={`/${locale}/admin/reviews`}>
                    {t.openReviewQueue}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Core System Stats */}
          <AdminSystemOverview dictionary={dictionary} stats={result.data.stats} />
          
          {/* Quick Actions */}
          <AdminQuickActions dictionary={dictionary} locale={locale} />
          
          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{t.recentActivity}</h2>
            <div className="grid gap-6 xl:grid-cols-2">
              <RecentBugReports
                dictionary={dictionary}
                locale={locale}
                reports={result.data.recentBugReports}
              />
              <RecentUsers
                dictionary={dictionary}
                locale={locale}
                users={result.data.recentUsers}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
