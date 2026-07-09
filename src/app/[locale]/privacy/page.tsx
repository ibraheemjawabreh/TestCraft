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
    title: dictionary.legal.privacy.title,
    description: dictionary.legal.privacy.subtitle,
    creator: siteConfig.creator.name,
  }
}

export default async function PrivacyPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  const dictionary = await getDictionary(locale)

  return (
    <LegalPageLayout
      dictionary={dictionary}
      document={legalContent[locale].privacy}
      kind="privacy"
      locale={locale}
    />
  )
}
