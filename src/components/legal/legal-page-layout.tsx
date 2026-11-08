import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'

import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { siteConfig } from '@/config/site'
import type { LegalDocument, LegalDocumentKind } from '@/content/legal'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/types'

interface LegalPageLayoutProps {
  dictionary: Dictionary
  document: LegalDocument
  kind: LegalDocumentKind
  locale: Locale
}

export function LegalPageLayout({
  dictionary,
  document,
  kind,
  locale,
}: LegalPageLayoutProps) {
  const isArabic = locale === 'ar'
  const title = kind === 'privacy' ? dictionary.legal.privacy.title : dictionary.legal.terms.title
  const subtitle =
    kind === 'privacy' ? dictionary.legal.privacy.subtitle : dictionary.legal.terms.subtitle
  const BackIcon = isArabic ? ArrowRight : ArrowLeft

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc]">
      <MarketingHeader locale={locale} suffix={'/' + kind} />
      <main className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl space-y-8">
          <Link
            href={`/${locale}/academy`}
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-[#cbd5e1] transition-colors hover:text-[#fbbf24] focus-visible:text-[#fbbf24]"
          >
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {dictionary.legal.backToAcademy}
          </Link>

          <section className="space-y-4">
            <div className="inline-flex rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-xs font-semibold text-[#fbbf24]">
              {siteConfig.name}
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-[#f8fafc] sm:text-5xl">
                {title}
              </h1>
              <p className="text-base leading-7 text-[#cbd5e1] sm:text-lg">
                {subtitle}
              </p>
              <p className="text-sm text-[#94a3b8]">
                {dictionary.legal.lastUpdated}: {document.updatedAt}
              </p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <Card className="border-white/10 bg-[#17233a]/80 text-[#f8fafc] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{dictionary.legal.tableOfContents}</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav aria-label={dictionary.legal.tableOfContents}>
                    <ol className="space-y-2">
                      {document.sections.map((section) => (
                        <li key={section.id}>
                          <a
                            href={`#${section.id}`}
                          className="block rounded-md text-sm leading-5 text-[#cbd5e1] transition-colors hover:text-[#fbbf24] focus-visible:text-[#fbbf24]"
                          >
                            {section.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </CardContent>
              </Card>
            </aside>

            <Card className="border-white/10 bg-[#17233a]/80 text-[#f8fafc] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <CardContent className="space-y-8 p-6 sm:p-8">
                {document.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-8 space-y-3">
                    <h2 className="font-heading text-xl font-bold text-[#f8fafc]">
                      {section.title}
                    </h2>
                    <div className="space-y-3 text-sm leading-7 text-[#cbd5e1] sm:text-base">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}

                <div className="rounded-lg border border-[#f97316]/25 bg-[#f97316]/10 p-4 text-sm leading-6 text-[#cbd5e1]">
                  <p>{document.disclaimer}</p>
                  <a
                    href={`mailto:${siteConfig.creator.email}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-md font-medium text-[#fbbf24] transition-colors hover:text-[#fde68a] focus-visible:text-[#fde68a]"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {siteConfig.creator.email}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} />
    </div>
  )
}
