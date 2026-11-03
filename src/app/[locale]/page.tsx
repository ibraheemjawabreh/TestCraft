import { resolveLocale } from '@/lib/locale'
import type { Metadata } from 'next'

import { type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { MarketingHomepage } from '@/components/marketing/marketing-homepage'

interface HomePageProps {
  params: Promise<{
    locale: string
  }>
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

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
export default async function HomePage({ params }: HomePageProps) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  const dictionary = await getDictionary(locale)

  return <MarketingHomepage dictionary={dictionary} locale={locale} />
}
