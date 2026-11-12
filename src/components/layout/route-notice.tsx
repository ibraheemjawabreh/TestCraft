'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveLocale } from '@/lib/locale'

export function RouteNotice({ pathMissing = false }: { pathMissing?: boolean }) {
  const locale = resolveLocale(usePathname()?.split('/')[1] ?? '')
  const ar = locale === 'ar'
  const title = pathMissing ? (ar ? 'مسار التعلّم غير موجود' : 'Learning path not found')
    : (ar ? 'الصفحة غير موجودة' : 'Page not found')
  return <div className="academy-shell grid min-h-[58svh] place-items-center px-4 py-12">
    <section className="academy-surface w-full max-w-md space-y-4 rounded-2xl p-6 text-center" aria-labelledby="not-found-heading">
      <SearchX className="mx-auto size-8 text-primary" aria-hidden="true" />
      <h1 id="not-found-heading" className="font-heading text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{ar ? 'ربما تغيّر الرابط أو لم يعد المحتوى متاحًا.' : 'The link may have changed or the content may be unavailable.'}</p>
      <Button asChild><Link href={'/' + locale + (pathMissing ? '/learning-paths' : '')}>
        {pathMissing ? (ar ? 'كل مسارات التعلّم' : 'All learning paths') : (ar ? 'العودة إلى الرئيسية' : 'Back to Home')}
      </Link></Button>
    </section>
  </div>
}
