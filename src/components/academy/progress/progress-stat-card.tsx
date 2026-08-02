import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProgressStatCardProps {
  label: string
  value: number
  icon: LucideIcon
  tone?: 'primary' | 'violet' | 'blue' | 'amber' | 'green' | 'red' | 'cyan' | 'yellow'
}

const toneClasses: Record<NonNullable<ProgressStatCardProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  violet: 'bg-violet-500/10 text-violet-500',
  blue: 'bg-blue-500/10 text-blue-500',
  amber: 'bg-amber-500/10 text-amber-500',
  green: 'bg-green-500/10 text-green-500',
  red: 'bg-red-500/10 text-red-500',
  cyan: 'bg-cyan-500/10 text-cyan-500',
  yellow: 'bg-yellow-500/10 text-yellow-500',
}

export function ProgressStatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}: ProgressStatCardProps) {
  return (
    <Card className="border-border/60 bg-card/75 backdrop-blur-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneClasses[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value.toLocaleString('en-US')}</p>
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
