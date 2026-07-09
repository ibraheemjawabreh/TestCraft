import { TesterFooter } from '@/components/layout/tester-footer'
import { TesterHeader } from '@/components/layout/tester-header'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface AcademyLayoutProps {
  children: React.ReactNode
  dictionary: Dictionary
  locale: Locale
  username: string
}

export function AcademyLayout({
  children,
  dictionary,
  locale,
  username,
}: AcademyLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <TesterHeader dictionary={dictionary} locale={locale} username={username} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>

      <TesterFooter dictionary={dictionary} locale={locale} />
    </div>
  )
}
