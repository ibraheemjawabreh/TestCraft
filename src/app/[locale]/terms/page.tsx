import type { Metadata } from 'next'

import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { siteConfig } from '@/config/site'
import { legalContent } from '@/content/legal'
import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.legal.terms.title,
    description: dictionary.legal.terms.subtitle,
    creator: siteConfig.creator.name,
  }
}

export default async function TermsPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)

  return (
    <LegalPageLayout
      dictionary={dictionary}
      document={legalContent[locale].terms}
      kind="terms"
      locale={locale}
    />
  )
}
