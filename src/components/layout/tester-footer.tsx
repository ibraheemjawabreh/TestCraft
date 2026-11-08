import Link from 'next/link'
import { BookOpen, FileText, Github, Linkedin, Mail, Trophy } from 'lucide-react'

import { siteConfig } from '@/config/site'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'
import { marketingCopy } from '@/components/marketing/copy'

interface TesterFooterProps {
  dictionary: Dictionary
  locale: Locale
}

interface FooterLink {
  label: string
  href: string
  icon?: React.ElementType
}

export function TesterFooter({ dictionary, locale }: TesterFooterProps) {
  const year = new Date().getFullYear()
  const isArabic = locale === 'ar'
  const madeBy = dictionary.footer.madeBy.replace('{creator}', siteConfig.creator.name)
  const creatorRole = dictionary.footer.creatorRole.replace('{site}', siteConfig.name)

  const usefulLinks: FooterLink[] = [
    {
      label: marketingCopy(locale).paths,
      href: `/${locale}/learning-paths`,
      icon: BookOpen,
    },
    {
      label: dictionary.footer.progress,
      href: `/${locale}/academy/progress`,
      icon: Trophy,
    },
    {
      label: dictionary.footer.reports,
      href: `/${locale}/academy/reports`,
      icon: FileText,
    },
    {
      label: dictionary.footer.privacyPolicy,
      href: `/${locale}/privacy`,
    },
    {
      label: dictionary.footer.terms,
      href: `/${locale}/terms`,
    },
  ]

  const contactLinks = [
    {
      label: dictionary.footer.linkedin,
      href: siteConfig.creator.linkedin,
      icon: Linkedin,
      ariaLabel: `${dictionary.footer.linkedin} - ${siteConfig.creator.name}`,
    },
    {
      label: dictionary.footer.github,
      href: siteConfig.creator.github,
      icon: Github,
      ariaLabel: `${dictionary.footer.github} - ${siteConfig.creator.name}`,
    },
    {
      label: dictionary.footer.email,
      href: `mailto:${siteConfig.creator.email}`,
      icon: Mail,
      ariaLabel: `${dictionary.footer.email} - ${siteConfig.creator.email}`,
    },
  ]

  return (
    <footer
      className="academy-footer border-t px-4 py-8 text-slate-100 sm:px-6"
      aria-labelledby="tester-footer-title"
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f97316] to-transparent"
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.9fr_0.8fr_0.8fr]">
            <section className="space-y-3">
              <h2
                id="tester-footer-title"
                className="font-heading text-2xl font-extrabold tracking-tight"
              >
                <span className="bg-gradient-to-r from-[#f97316] to-[#fbbf24] bg-clip-text text-transparent">
                  {siteConfig.name}
                </span>
              </h2>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {dictionary.footer.brandDescription}
              </p>
            </section>

            <section className="space-y-3" aria-labelledby="footer-creator-title">
              <h3 id="footer-creator-title" className="text-sm font-semibold text-foreground">
                {madeBy}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {creatorRole}
              </p>
            </section>

            <nav className="space-y-3" aria-labelledby="footer-contact-title">
              <h3 id="footer-contact-title" className="text-sm font-semibold text-foreground">
                {dictionary.footer.contact}
              </h3>
              <ul className="space-y-2">
                {contactLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                      rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                      aria-label={link.ariaLabel}
                      className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary"
                    >
                      <link.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="space-y-3" aria-labelledby="footer-links-title">
              <h3 id="footer-links-title" className="text-sm font-semibold text-foreground">
                {dictionary.footer.usefulLinks}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {usefulLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={false}
                      className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary"
                    >
                      {link.icon ? <link.icon className="h-4 w-4" aria-hidden="true" /> : null}
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="relative mt-8 flex flex-col gap-2 border-t border-border/50 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {year} {siteConfig.name}. {dictionary.footer.allRightsReserved}
            </p>
            <p className={isArabic ? 'sm:text-left' : 'sm:text-right'}>
              {dictionary.footer.builtWithCare}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
