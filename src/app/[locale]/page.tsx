import { resolveLocale } from '@/lib/locale'
import type { Metadata } from 'next'

import { MarketingHomepage } from '@/components/marketing/marketing-homepage'
import { marketingCopy } from '@/components/marketing/copy'

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

  const t = marketingCopy(locale)

  return {
    title: t.heroTag,
    description: t.heroBody,
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  return <MarketingHomepage locale={locale} />
}
