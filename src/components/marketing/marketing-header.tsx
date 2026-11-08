import Link from 'next/link'
import { FlaskConical, Globe2, UserRound } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { getPublicViewer } from '@/lib/learning-catalog/data'
import { marketingCopy } from './copy'
import s from './marketing.module.css'

export async function MarketingHeader({ locale, suffix = '' }: { locale: Locale; suffix?: string }) {
  const [t, viewer] = [marketingCopy(locale), await getPublicViewer()]
  const home = '/' + locale
  const paths = home + '/learning-paths'
  const alternate = locale === 'ar' ? 'en' : 'ar'
  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Link href={home} className={s.brand} aria-label={'TestCraft — ' + t.home}>
          <span className={s.brandMark}><FlaskConical size={18} aria-hidden="true" /></span>
          <span dir="ltr">Test<span>Craft</span></span>
        </Link>
        <nav className={s.nav} aria-label={t.nav}>
          <Link href={home} aria-current={!suffix ? 'page' : undefined}>{t.home}</Link>
          <Link href={paths} aria-current={suffix.startsWith('/learning-paths') ? 'page' : undefined}>{t.paths}</Link>
        </nav>
        <div className={s.headerActions}>
          <Link href={'/' + alternate + suffix} prefetch={false} className={s.language}
            lang={alternate} aria-label={alternate === 'ar' ? 'العربية' : 'English'}>
            <Globe2 size={15} aria-hidden="true" />{alternate === 'ar' ? 'عربي' : 'EN'}
          </Link>
          {viewer ? (
            <Link href={home + '/settings'} prefetch={false} className={s.signup}><UserRound size={15} aria-hidden="true" />{t.account}</Link>
          ) : (
            <>
              <Link href={home + '/login'} prefetch={false} className={s.login}>{t.login}</Link>
              <Link href={home + '/register'} prefetch={false} className={s.signup}>{t.signup}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
