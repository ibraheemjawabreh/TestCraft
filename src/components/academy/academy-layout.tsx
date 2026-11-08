import { TesterFooter } from '@/components/layout/tester-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { AccountMenu } from '@/components/layout/account-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'
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
    <div className="academy-shell min-h-screen text-foreground transition-colors">
      <SiteHeader locale={locale} role="tester"
        accountMenu={<AccountMenu account={account} locale={locale} admin={false} />}
        controls={<ThemeToggle dictionary={{ theme: dictionary.theme }} />} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fade-in-up">
        {children}
      </main>

      <TesterFooter dictionary={dictionary} locale={locale} />
    </div>
  )
}
