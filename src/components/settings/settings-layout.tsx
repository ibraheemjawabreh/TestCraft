import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TesterFooter } from '@/components/layout/tester-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { AccountMenu } from '@/components/layout/account-menu'
import type { AccountIdentity } from '@/lib/auth/account-identity'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface SettingsLayoutProps {
  children: React.ReactNode
  dictionary: Dictionary
  locale: Locale
  profile: Profile
  account: AccountIdentity
}

export function SettingsLayout({
  children,
  dictionary,
  locale,
  profile,
  account,
}: SettingsLayoutProps) {
  const isAdmin = profile.role === 'admin'

  return (
    <div className="academy-shell min-h-screen text-foreground transition-colors">
      {isAdmin ? <header className="academy-header sticky top-0 z-40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link
            href={`/${locale}/admin`}
            className="flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {dictionary.settings.backToDashboard}
          </Link>
        </div>
      </header> : <SiteHeader locale={locale} role="tester"
        accountMenu={<AccountMenu account={account} locale={locale} admin={false} />} />}

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 md:py-12">
        <div className="academy-page-heading space-y-1 mb-8 rounded-2xl p-6 sm:p-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {dictionary.settings.title}
          </h1>
          <p className="text-muted-foreground">
            {dictionary.settings.subtitle}
          </p>
        </div>
        {children}
      </main>

      {!isAdmin && <TesterFooter dictionary={dictionary} locale={locale} />}
    </div>
  )
}
