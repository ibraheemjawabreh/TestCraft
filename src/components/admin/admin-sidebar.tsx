'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'

import { Logo } from '@/components/brand/Logo'
import { type Locale } from '@/i18n/config'

interface AdminSidebarDictionary {
  admin: {
    nav: {
      dashboard: string
      reviews: string
      curriculum: string
      users: string
      analytics: string
      settings: string
    }
  }
  navigation: {
    logout: string
  }
}

interface AdminSidebarProps {
  dictionary: AdminSidebarDictionary
  locale: Locale
}

export function AdminSidebar({ dictionary, locale }: AdminSidebarProps) {
  const pathname = usePathname()
  const nav = dictionary.admin.nav

  const navItems = [
    { name: nav.dashboard, href: `/${locale}/admin`, icon: LayoutDashboard, exact: true },
    { name: nav.reviews, href: `/${locale}/admin/reviews`, icon: ClipboardCheck, exact: false },
    { name: nav.curriculum || 'Curriculum', href: `/${locale}/admin/curriculum`, icon: BookOpen, exact: false },
    { name: nav.users, href: `/${locale}/admin/users`, icon: Users, exact: false },
    { name: nav.analytics, href: `/${locale}/admin/analytics`, icon: BarChart3, exact: false },
    { name: nav.settings, href: `/${locale}/admin/settings`, icon: Settings, exact: false },
  ]

  return (
    <aside className="admin-sidebar fixed inset-y-0 start-0 z-50 hidden w-64 flex-col backdrop-blur-xl sm:flex transition-colors">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Logo locale={locale} href={`/${locale}/admin`} />
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[#f97316]/15 text-[#fbbf24]'
                  : 'text-slate-600 hover:bg-[#f97316]/10 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
              ].join(' ')}
            >
              <item.icon
                className={[
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-[#f97316] dark:text-[#fbbf24]' : 'text-slate-500 dark:text-slate-400',
                ].join(' ')}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300"
          >
            <LogOut className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            {dictionary.navigation.logout}
          </button>
        </form>
      </div>
    </aside>
  )
}
