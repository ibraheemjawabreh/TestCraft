import type { Metadata } from 'next'

import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { MarketingHomepage } from '@/components/marketing/marketing-homepage'

interface HomePageProps {
  params: {
    locale: Locale
  }
}

export async function generateMetadata({
  params: { locale },
}: HomePageProps): Promise<Metadata> {
  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.marketing.meta.title,
    description: dictionary.marketing.meta.description,
  }
}

/**
 * Public Marketing Homepage — Sunset Tech visual identity.
 * Replaces the previous redirect-to-login behavior.
 * Admin and academy routes remain fully protected and unaffected.
 */
export default async function HomePage({ params: { locale } }: HomePageProps) {
  const dictionary = await getDictionary(locale)

  return <MarketingHomepage dictionary={dictionary} locale={locale} />
}
