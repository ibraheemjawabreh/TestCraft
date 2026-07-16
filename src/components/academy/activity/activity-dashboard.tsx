import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { TesterActivity } from '@/lib/academy/activity'

import { RecentAiFeedbackSection } from './recent-ai-feedback-section'
import { RecentReportsSection } from './recent-reports-section'
import { UserBadgesSection } from './user-badges-section'
import { ReviewedAttemptsSection } from './reviewed-attempts-section'

interface ActivityDashboardProps {
  activity: TesterActivity
  dictionary: Dictionary
  locale: Locale
}

export function ActivityDashboard({ activity, dictionary, locale }: ActivityDashboardProps) {
  return (
    <div className="space-y-8">
      <div className="academy-page-heading space-y-2 rounded-2xl p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
          {dictionary.academy.activity.title}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{dictionary.academy.activity.subtitle}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <RecentReportsSection
            reports={activity.recentReports}
            dictionary={dictionary}
            locale={locale}
          />
          <RecentAiFeedbackSection
            feedback={activity.recentAiFeedback}
            dictionary={dictionary}
            locale={locale}
          />
          <ReviewedAttemptsSection
            attempts={activity.reviewedAttempts}
            dictionary={dictionary}
            locale={locale}
          />
        </div>
        <UserBadgesSection badges={activity.badges} dictionary={dictionary} locale={locale} />
      </div>
    </div>
  )
}
