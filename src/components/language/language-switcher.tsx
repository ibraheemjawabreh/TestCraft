'use client'

import { Globe2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { HeaderSelect } from '@/components/layout/header-select'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import { safeLearningRedirect } from '@/lib/auth/learning-redirect'

export function LanguageSwitcher({ dictionary, locale }: { dictionary: Pick<Dictionary, 'language'>; locale: Locale }) {
  const router = useRouter()
  const t = dictionary.language

  function switchLocale(value: string) {
    if ((value !== 'en' && value !== 'ar') || value === locale) return
    const current = new URL(window.location.href)
    const intended = safeLearningRedirect(current.searchParams.get('redirectTo'), locale)
    if (current.searchParams.has('redirectTo')) {
      const translated = intended && safeLearningRedirect('/' + value + intended.slice(locale.length + 1), value)
      if (translated) current.searchParams.set('redirectTo', translated)
      else current.searchParams.delete('redirectTo')
    }
    current.pathname = '/' + value + current.pathname.slice(locale.length + 1)
    document.cookie = 'testcraft-locale=' + value + '; path=/; max-age=31536000; samesite=lax'
    router.push(current.pathname + current.search + current.hash, { scroll: !current.hash })
  }

  return <HeaderSelect label={t.switchLanguage} value={locale} onChange={switchLocale}
    icon={<><Globe2 className="size-4 shrink-0" />{locale === 'ar' ? 'ع' : 'EN'}</>}>
    <option lang="en" value="en">English</option>
    <option lang="ar" value="ar">العربية</option>
  </HeaderSelect>
}
