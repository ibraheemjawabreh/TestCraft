import Link from 'next/link'
import { FileText, Sword, Users } from 'lucide-react'

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
      label: t.manageChallenges,
      href: `/${locale}/admin/challenges`,
      icon: Sword,
    },
    {
      label: t.reviewReports,
      href: `/${locale}/admin/reports`,
      icon: FileText,
    },
    {
      label: t.viewUsers,
      href: `/${locale}/admin/users`,
      icon: Users,
    },
  ]

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg">{t.quickActions}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Button key={action.href} asChild variant="outline" className="justify-start gap-2">
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
