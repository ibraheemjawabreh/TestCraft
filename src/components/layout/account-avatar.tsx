'use client'

import { useState } from 'react'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AccountAvatar({ name, src, className }: { name: string; src: string | null; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map(word => Array.from(word)[0] ?? '').join('').toLocaleUpperCase()
  return (
    <span aria-hidden="true" className={cn(
      'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#432c1a] font-semibold text-[#ffcb95]',
      className,
    )}>
      {initials || <UserRound size={17} />}
      {src && src !== failedSource && (
        // Profile images are already sized by the browser. Avoid proxying user-provided URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailedSource(src)}
          className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  )
}
