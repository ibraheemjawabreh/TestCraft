import Link from 'next/link'
import { LogOut, User } from 'lucide-react'

import { LanguageSwitcher } from '@/components/language/language-switcher'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface TesterHeaderProps {
  dictionary: Dictionary
  locale: Locale
  username: string
}

export function TesterHeader({ dictionary, locale, username }: TesterHeaderProps) {
  const navItems = [
    { label: dictionary.testerNav.academy, href: `/${locale}/academy` },
    { label: dictionary.testerNav.challenges, href: `/${locale}/academy/challenges` },
    { label: dictionary.testerNav.activity, href: `/${locale}/academy/activity` },
    { label: dictionary.testerNav.progress, href: `/${locale}/academy/progress` },
    { label: dictionary.testerNav.reports, href: `/${locale}/academy/reports` },
    { label: dictionary.testerNav.settings, href: `/${locale}/settings` },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:py-0">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle dictionary={dictionary} />
            <LanguageSwitcher dictionary={dictionary} locale={locale} />
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle dictionary={dictionary} />
          <LanguageSwitcher dictionary={dictionary} locale={locale} />

          <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5">
            <User className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="max-w-[140px] truncate text-sm font-medium text-foreground/80">
              {username}
            </span>
          </div>

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dictionary.navigation.logout}</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
