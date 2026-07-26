'use client'

import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n/config'

interface FormattedDateProps {
  value: string | null | undefined
  locale: Locale
  fallback?: string
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle']
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle']
}

/**
 * Renders a date only on the client to avoid server/client ICU hydration mismatches.
 * The server renders a neutral placeholder and the client swaps in the real formatted date.
 */
export function FormattedDate({
  value,
  locale,
  fallback = '—',
  dateStyle = 'medium',
  timeStyle,
}: FormattedDateProps) {
  const [formatted, setFormatted] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setFormatted(fallback)
      return
    }
    try {
      setFormatted(
        new Intl.DateTimeFormat(locale, {
          dateStyle,
          ...(timeStyle ? { timeStyle } : {}),
        }).format(new Date(value))
      )
    } catch {
      setFormatted(fallback)
    }
  }, [value, locale, dateStyle, timeStyle, fallback])

  return (
    <span 
      suppressHydrationWarning 
      className={formatted === null ? "text-muted-foreground text-sm" : ""}
    >
      {formatted === null ? "—" : formatted}
    </span>
  )
}
