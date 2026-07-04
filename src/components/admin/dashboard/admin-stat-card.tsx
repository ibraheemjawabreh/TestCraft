import { type ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: ReactNode
}

export function AdminStatCard({ title, value, icon }: AdminStatCardProps) {
  return (
    <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-xl transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="break-words font-heading text-2xl font-bold text-foreground">
              {value}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
