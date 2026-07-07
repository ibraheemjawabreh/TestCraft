import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'
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
      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href={`/${locale}/academy`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                {dictionary.navigation.academy}
              </Link>
              <Link
                href={`/${locale}/academy/challenges`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                {dictionary.navigation.challenges}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle dictionary={dictionary} />
            <LanguageSwitcher dictionary={dictionary} locale={locale} />

            <Link
              href={`/${locale}/settings`}
              className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/8 px-3 py-1.5 hover:bg-primary/15 transition-colors"
              title={dictionary.navigation.settings}
            >
              <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground/80 max-w-[140px] truncate">
                {username}
              </span>
            </Link>

            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{dictionary.navigation.logout}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
