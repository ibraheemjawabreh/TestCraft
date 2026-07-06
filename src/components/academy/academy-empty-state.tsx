import type { LucideIcon } from 'lucide-react'

interface AcademyEmptyStateProps {
  icon: LucideIcon
  message: string
  className?: string
}

export function AcademyEmptyState({
  icon: Icon,
  message,
  className = '',
}: AcademyEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/30 py-12 px-6 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/60">
        <Icon className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
