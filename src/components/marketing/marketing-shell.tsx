import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { MarketingHeader } from './marketing-header'
import { MarketingFooter } from './marketing-footer'
import { marketingCopy } from './copy'
import s from './marketing.module.css'

export function MarketingShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <div className={s.site}>
      <a href="#marketing-main" className={s.skip}>{marketingCopy(locale).skip}</a>
      <MarketingHeader locale={locale} />
      <main id="marketing-main" tabIndex={-1}>{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  )
}
