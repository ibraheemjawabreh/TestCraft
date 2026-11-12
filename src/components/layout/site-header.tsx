import Link from 'next/link'
import { HeaderLinks } from './header-links'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'
import { getDictionary } from '@/i18n/get-dictionary'
import { studentHomePath } from '@/lib/auth/learning-redirect'
import { marketingCopy } from '@/components/marketing/copy'
import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import s from '@/components/marketing/marketing.module.css'

type Props = {
  locale: Locale
  accountMenu?: ReactNode
  role?: string
  publicOnly?: boolean
  hideAuthActions?: boolean
}

export async function SiteHeader({ locale, accountMenu, role, publicOnly, hideAuthActions }: Props) {
  const t = marketingCopy(locale)
  const dictionary = await getDictionary(locale)
  const prefix = '/' + locale
  const student = role === 'tester' && !publicOnly
  const home = student ? studentHomePath(locale) : prefix
  const ar = locale === 'ar'
  const links = [
    { label: t.home, href: home },
    { label: t.paths, href: prefix + '/learning-paths', children: true },
  ]
  if (student) {
    links.push(
      { label: ar ? 'التقدّم' : 'Progress', href: prefix + '/academy/progress' },
      { label: ar ? 'التحدّيات' : 'Challenges', href: prefix + '/academy/challenges', children: true },
    )
  } else if (role === 'tester') {
    links.push({ label: ar ? 'رئيسية الطالب' : 'Student Home', href: studentHomePath(locale) })
  }

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <Logo locale={locale} href={home} className={s.brand} />
        <HeaderLinks label={t.nav} links={links} />
        <div className={s.headerActions}>
          <LanguageSwitcher locale={locale} dictionary={{ language: dictionary.language }} />
          <ThemeToggle dictionary={{ theme: dictionary.theme }} />
          {accountMenu ?? (!hideAuthActions && (
            <>
              <Link href={prefix + '/login'} prefetch={false} className={s.login}>{t.login}</Link>
              <Link href={prefix + '/register'} prefetch={false} className={s.signup}>{t.signup}</Link>
            </>
          ))}
        </div>
      </div>
    </header>
  )
}
