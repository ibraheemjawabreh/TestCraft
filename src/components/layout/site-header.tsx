import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import { HeaderLinks, HeaderLocaleLink } from './header-links'
import { marketingCopy } from '@/components/marketing/copy'
import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import s from '@/components/marketing/marketing.module.css'

type Props = {
  locale: Locale
  accountMenu?: ReactNode
  role?: string
  controls?: ReactNode
}

export function SiteHeader({ locale, accountMenu, role, controls }: Props) {
  const t = marketingCopy(locale)
  const home = '/' + locale
  const paths = home + '/learning-paths'
  const ar = locale === 'ar'
  const links = [
    { label: t.home, href: home },
    { label: t.paths, href: paths, children: true },
  ]
  if (role === 'tester') {
    links.push(
      { label: ar ? 'التقدّم' : 'Progress', href: home + '/academy/progress' },
      { label: ar ? 'التحدّيات' : 'Challenges', href: home + '/academy/challenges', children: true },
    )
  }

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Link href={home} prefetch={false} className={s.brand} aria-label={'TestCraft — ' + t.home}>
          <span className={s.brandMark}><FlaskConical size={18} aria-hidden="true" /></span>
          <span dir="ltr">Test<span>Craft</span></span>
        </Link>
        <HeaderLinks label={t.nav} links={links} />
        <div className={s.headerActions}>
          {controls}
          <HeaderLocaleLink locale={locale} />
          {accountMenu ?? (
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
