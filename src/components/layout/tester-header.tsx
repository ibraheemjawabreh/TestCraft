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
    <header className="academy-header sticky top-0 z-40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:py-0">
        <div className="flex items-center justify-between gap-4">
          <Logo locale={locale} href={`/${locale}/academy`} />
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle dictionary={{ theme: dictionary.theme }} />
            <LanguageSwitcher dictionary={{ language: dictionary.language }} locale={locale} />
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-[#f97316]/10 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle dictionary={{ theme: dictionary.theme }} />
          <LanguageSwitcher dictionary={{ language: dictionary.language }} locale={locale} />

          <div className="flex items-center gap-2 rounded-lg border border-[#fbbf24]/25 bg-[#f97316]/10 px-3 py-1.5">
            <User className="h-3.5 w-3.5 text-[#fbbf24]" aria-hidden="true" />
            <span className="max-w-[140px] truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {username}
            </span>
          </div>

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-all hover:bg-[#f97316]/10 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
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
