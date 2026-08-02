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
    <div className="academy-shell min-h-screen text-foreground transition-colors">
      <TesterHeader dictionary={dictionary} locale={locale} username={username} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 animate-fade-in-up">
        {children}
      </main>

      <TesterFooter dictionary={dictionary} locale={locale} />
    </div>
  )
}
