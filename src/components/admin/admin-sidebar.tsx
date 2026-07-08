'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Sword, FileText, Users, Settings, LogOut, BookOpen, ClipboardList } from 'lucide-react'

import { Logo } from '@/components/brand/Logo'
import { type Locale } from '@/i18n/config'

interface AdminSidebarDictionary {
  admin: {
    overview: string
    challengesNav: string
    reports: string
    reportsReview: string
    users: string
    settings: string
  }
  navigation: {
    logout: string
  }
  learning: {
    lessons: string
  }
}

interface AdminSidebarProps {
  dictionary: AdminSidebarDictionary
  locale: Locale
}

export function AdminSidebar({ dictionary, locale }: AdminSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { name: dictionary.admin.overview, href: `/${locale}/admin`, icon: LayoutDashboard, exact: true },
    { name: dictionary.admin.challengesNav, href: `/${locale}/admin/challenges`, icon: Sword, exact: false },
    { name: dictionary.learning.lessons, href: `/${locale}/admin/lessons`, icon: BookOpen, exact: false },
    { name: dictionary.admin.reportsReview, href: `/${locale}/admin/reports`, icon: ClipboardList, exact: false },
    { name: dictionary.admin.users, href: `/${locale}/admin/users`, icon: Users, exact: false },
    { name: dictionary.admin.settings, href: `/${locale}/admin/settings`, icon: Settings, exact: false },
  ]

  return (
    <aside className="fixed inset-y-0 start-0 z-50 hidden w-64 flex-col border-e border-border/50 bg-card/40 backdrop-blur-xl sm:flex transition-colors">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Logo />
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
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              ].join(' ')}
            >
              <item.icon
                className={[
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground/70',
                ].join(' ')}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-border/50">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            {dictionary.navigation.logout}
          </button>
        </form>
      </div>
    </aside>
  )
}
