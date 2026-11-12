import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { MarketingHeader } from './marketing-header'
import { TesterFooter } from '@/components/layout/tester-footer'
import { getDictionary } from '@/i18n/get-dictionary'
import { marketingCopy } from './copy'
import s from './marketing.module.css'

export async function MarketingShell({ locale, children, publicOnly }: { locale: Locale; children: ReactNode; publicOnly?: boolean }) {
  const dictionary = await getDictionary(locale)
  return (
    <div className={s.site}>
      <a href="#marketing-main" className={s.skip}>{marketingCopy(locale).skip}</a>
      <MarketingHeader locale={locale} publicOnly={publicOnly} />
      <main id="marketing-main" tabIndex={-1}>{children}</main>
      <TesterFooter locale={locale} dictionary={dictionary} publicPage />
    </div>
  )
}
