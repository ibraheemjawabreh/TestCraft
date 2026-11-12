import { TesterFooter } from '@/components/layout/tester-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { AccountMenu } from '@/components/layout/account-menu'
import type { AccountIdentity } from '@/lib/auth/account-identity'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface AcademyLayoutProps {
  children: React.ReactNode
  dictionary: Dictionary
  locale: Locale
  account: AccountIdentity
}

export function AcademyLayout({
  children,
  dictionary,
  locale,
  account,
}: AcademyLayoutProps) {
  return (
    <div className="academy-shell flex min-h-svh flex-col text-foreground">
      <a href="#student-main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-3">
        {locale === 'ar' ? 'انتقل إلى المحتوى' : 'Skip to content'}
      </a>
      <SiteHeader locale={locale} role="tester"
        accountMenu={<AccountMenu account={account} locale={locale} admin={false} />} />

      <main id="student-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <TesterFooter dictionary={dictionary} locale={locale} />
    </div>
  )
}
