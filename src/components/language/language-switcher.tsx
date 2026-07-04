'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { i18n, type Locale } from '@/i18n/config'

export function LanguageSwitcher({ dictionary, locale }: { dictionary: any; locale: Locale }) {
  const pathname = usePathname()
  const router = useRouter()

  const switchLocale = (newLocale: Locale) => {
    if (!pathname) return
    document.cookie = `testcraft-locale=${newLocale}; path=/; max-age=31536000; samesite=lax`
    const segments = pathname.split('/')
    // Replace the locale segment
    segments[1] = newLocale
    router.push(segments.join('/'))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" aria-label={dictionary.language.switchLanguage}>
          <Globe className="h-4 w-4" />
          <span>{locale === 'en' ? 'English' : 'العربية'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLocale('en')} disabled={locale === 'en'}>
          {dictionary.language.english}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLocale('ar')} disabled={locale === 'ar'}>
          {dictionary.language.arabic}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
