import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'

import { TesterFooter } from '@/components/layout/tester-footer'
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
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <Link
            href={`/${locale}/academy`}
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary"
          >
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {dictionary.legal.backToAcademy}
          </Link>

          <section className="space-y-4">
            <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {siteConfig.name}
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                {subtitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {dictionary.legal.lastUpdated}: {document.updatedAt}
              </p>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <Card className="border-primary/15 bg-card/70 shadow-card backdrop-blur-xl">
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
                            className="block rounded-md text-sm leading-5 text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary"
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

            <Card className="border-primary/15 bg-card/70 shadow-card backdrop-blur-xl">
              <CardContent className="space-y-8 p-6 sm:p-8">
                {document.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-8 space-y-3">
                    <h2 className="font-heading text-xl font-bold text-foreground">
                      {section.title}
                    </h2>
                    <div className="space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}

                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-muted-foreground">
                  <p>{document.disclaimer}</p>
                  <a
                    href={`mailto:${siteConfig.creator.email}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-md font-medium text-primary transition-colors hover:text-primary/80 focus-visible:text-primary/80"
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

      <TesterFooter dictionary={dictionary} locale={locale} />
    </div>
  )
}
