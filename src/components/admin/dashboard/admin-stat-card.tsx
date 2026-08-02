import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type Accent = 'primary' | 'green' | 'amber' | 'red' | 'blue' | 'violet'

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  accent?: Accent
  className?: string
}

const accentMap: Record<Accent, { icon: string; text: string }> = {
  primary: { icon: 'border-primary/15 bg-primary/10 text-primary', text: 'text-foreground' },
  green:   { icon: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { icon: 'border-amber-500/20 bg-amber-500/10 text-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  red:     { icon: 'border-rose-500/20 bg-rose-500/10 text-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  blue:    { icon: 'border-blue-500/20 bg-blue-500/10 text-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  violet:  { icon: 'border-violet-500/20 bg-violet-500/10 text-violet-500', text: 'text-violet-600 dark:text-violet-400' },
}

export function AdminStatCard({ title, value, icon, accent = 'primary', className }: AdminStatCardProps) {
  const colors = accentMap[accent]
  return (
    <Card className={`border-border/50 bg-card/70 shadow-sm backdrop-blur-xl card-glow-hover animate-scale-in opacity-0 ${className ?? ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`break-words font-heading text-2xl font-bold transition-transform duration-300 ${colors.text}`}>
              {value}
            </p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-300 hover:scale-110 ${colors.icon}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
