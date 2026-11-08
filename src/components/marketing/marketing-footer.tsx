import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { marketingCopy } from './copy'
import s from './marketing.module.css'

export function MarketingFooter({ locale }: { locale: Locale }) {
  const t = marketingCopy(locale)
  const home = '/' + locale
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div><strong dir="ltr">TestCraft</strong><p>{t.footer}</p></div>
        <nav aria-label={locale === 'ar' ? 'روابط التذييل' : 'Footer navigation'}>
          <Link href={home + '/learning-paths'}>{t.paths}</Link>
          <Link href={home + '/privacy'} prefetch={false}>{t.privacy}</Link>
          <Link href={home + '/terms'} prefetch={false}>{t.terms}</Link>
        </nav>
        <span className={s.copyright}>© {new Date().getUTCFullYear()} TestCraft</span>
      </div>
    </footer>
  )
}
