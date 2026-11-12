import type { ReactNode } from 'react'
import { resolveLocale } from '@/lib/locale'
import { SiteHeader } from '@/components/layout/site-header'

export default async function AuthLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale)
  return <div className="academy-shell flex min-h-svh flex-col">
    <SiteHeader locale={locale} publicOnly hideAuthActions />
    <main className="grid w-full flex-1 place-items-center px-4 py-8 sm:py-12">{children}</main>
  </div>
}
