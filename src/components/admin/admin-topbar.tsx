'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'
import { type Locale } from '@/i18n/config'
import { ShieldCheck, Settings } from 'lucide-react'

interface AdminTopbarProps {
  dictionary: any
  locale: Locale
  email: string
}

export function AdminTopbar({ dictionary, locale, email }: AdminTopbarProps) {
  return (
    <header className="admin-topbar sticky top-0 z-40 flex h-16 w-full items-center justify-between px-6 backdrop-blur-xl">
      {/* Mobile spacer / Title area (can be expanded later for mobile menu toggle) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground sm:hidden">
          {dictionary.admin.dashboard.title}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <ThemeToggle dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} locale={locale} />
        
        {/* Admin Pill */}
        <Link
          href={`/${locale}/settings`}
          className="hidden sm:flex items-center gap-2.5 rounded-xl border border-[#f97316]/25 bg-[#f97316]/10 px-3.5 py-1.5 shadow-sm hover:bg-[#f97316]/15 transition-colors"
          title={dictionary.navigation?.settings ?? "Settings"}
        >
          <ShieldCheck className="h-4 w-4 text-[#fbbf24]" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[#fbbf24]">
              {dictionary.admin.adminOnly}
            </span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-100 max-w-[150px] truncate leading-tight">
              {email}
            </span>
          </div>
          <Settings className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ml-2" aria-hidden="true" />
        </Link>
      </div>
    </header>
  )
}
