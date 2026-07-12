import Link from 'next/link'
import { FileText, Sword, Users, BookOpen, BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface AdminQuickActionsProps {
  dictionary: Dictionary
  locale: Locale
}

export function AdminQuickActions({ dictionary, locale }: AdminQuickActionsProps) {
  const t = dictionary.admin.dashboard

  const actions = [
    {
      label: t.reviewSubmissions,
      href: `/${locale}/admin/reviews`,
      icon: FileText,
    },
    {
      label: t.manageChallenges,
      href: `/${locale}/admin/challenges`,
      icon: Sword,
    },
    {
      label: t.manageUsers,
      href: `/${locale}/admin/users`,
      icon: Users,
    },
    {
      label: t.createLesson,
      href: `/${locale}/admin/lessons`,
      icon: BookOpen,
    },
    {
      label: t.viewAnalytics,
      href: `/${locale}/admin/analytics`,
      icon: BarChart3,
    },
  ]

  return (
    <Card className="border-border/50 bg-card/70 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t.quickActions}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button key={action.href} asChild variant="secondary" className="gap-2">
            <Link href={action.href}>
              <action.icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
