import Link from 'next/link'
import { BookOpen, Github, Linkedin, Mail, Trophy } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { siteConfig } from '@/config/site'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import { marketingCopy } from '@/components/marketing/copy'
import { studentHomePath } from '@/lib/auth/learning-redirect'

export function TesterFooter({ dictionary, locale, publicPage = false }: { dictionary: Dictionary; locale: Locale; publicPage?: boolean }) {
  const t = dictionary.footer
  const prefix = '/' + locale
  const usefulLinks = [
    { label: marketingCopy(locale).paths, href: prefix + '/learning-paths', icon: BookOpen },
    ...(!publicPage ? [{ label: t.progress, href: prefix + '/academy/progress', icon: Trophy }] : []),
    { label: t.privacyPolicy, href: prefix + '/privacy' },
    { label: t.terms, href: prefix + '/terms' },
  ]
  const contactLinks = [
    { label: t.linkedin, href: siteConfig.creator.linkedin, icon: Linkedin },
    { label: t.github, href: siteConfig.creator.github, icon: Github },
    { label: t.email, href: 'mailto:' + siteConfig.creator.email, icon: Mail },
  ]
  const linkStyle = 'inline-flex min-h-8 items-center gap-2 rounded text-sm text-muted-foreground hover:text-primary hover:underline'

  return (
    <footer className="border-t bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.75fr_0.85fr]">
          <section className="min-w-0 space-y-3" aria-label="TestCraft">
            <Logo locale={locale} href={publicPage ? prefix : studentHomePath(locale)} />
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">{t.brandDescription}</p>
          </section>
          <section className="min-w-0 space-y-3">
            <h2 className="text-sm font-semibold">{t.madeBy.replace('{creator}', siteConfig.creator.name)}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{t.creatorRole.replace('{site}', siteConfig.name)}</p>
          </section>
          <nav className="min-w-0 space-y-2" aria-label={t.contact}>
            <h2 className="text-sm font-semibold">{t.contact}</h2>
            <ul>{contactLinks.map(({ label, href, icon: Icon }) => (
              <li key={href}><a href={href} className={linkStyle}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}>
                <Icon size={15} aria-hidden="true" />{label}
              </a></li>
            ))}</ul>
          </nav>
          <nav className="min-w-0 space-y-2" aria-label={t.usefulLinks}>
            <h2 className="text-sm font-semibold">{t.usefulLinks}</h2>
            <ul>{usefulLinks.map(({ label, href, icon: Icon }) => (
              <li key={href}><Link href={href} prefetch={false} className={linkStyle}>
                {Icon && <Icon size={15} aria-hidden="true" />}{label}
              </Link></li>
            ))}</ul>
          </nav>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-xs text-muted-foreground">
          <p>© {new Date().getUTCFullYear()} {siteConfig.name}. {t.allRightsReserved}</p>
          <p>{t.builtWithCare}</p>
        </div>
      </div>
    </footer>
  )
}
