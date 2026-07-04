import { type ReactNode } from 'react'

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  description?: string
}

export function AdminStatCard({ title, value, icon, description }: AdminStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl transition-all hover:shadow-md hover:border-primary/30">
      {/* Decorative top glow */}
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-[30px]"
      />
      
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      
      <div className="mt-4 flex flex-col gap-1">
        <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  )
}
