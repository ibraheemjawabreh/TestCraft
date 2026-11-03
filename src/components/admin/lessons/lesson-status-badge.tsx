import {factoryEn,factoryAr} from '@/i18n/factory'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LessonStatusBadgeProps {
  locale?:'en'|'ar'
  isPublished: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function LessonStatusBadge({ locale='en', isPublished, className, size = 'sm' }: LessonStatusBadgeProps) {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  if (isPublished) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 font-medium text-green-400',
          textSize,
          className,
        )}
      >
        <CheckCircle2 className={iconSize} aria-hidden="true" />
{(locale==='ar'?factoryAr:factoryEn).status.published}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-400',
        textSize,
        className,
      )}
    >
      <Clock3 className={iconSize} aria-hidden="true" />
{(locale==='ar'?factoryAr:factoryEn).status.applied}
    </span>
  )
}
