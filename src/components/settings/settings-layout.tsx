import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TesterFooter } from '@/components/layout/tester-footer'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface SettingsLayoutProps {
  children: React.ReactNode
  dictionary: Dictionary
  locale: Locale
  profile: Profile
}

export function SettingsLayout({
  children,
  dictionary,
  locale,
  profile,
}: SettingsLayoutProps) {
  const backHref = profile.role === 'admin' ? `/${locale}/admin` : `/${locale}/academy`
  const backText = profile.role === 'admin' ? dictionary.settings.backToDashboard : dictionary.settings.backToAcademy
  const showTesterFooter = profile.role !== 'admin'

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link
            href={backHref}
            className="flex items-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {backText}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 md:py-12">
        <div className="space-y-1 mb-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {dictionary.settings.title}
          </h1>
          <p className="text-muted-foreground">
            {dictionary.settings.subtitle}
          </p>
        </div>
        {children}
      </main>

      {showTesterFooter ? <TesterFooter dictionary={dictionary} locale={locale} /> : null}
    </div>
  )
}
