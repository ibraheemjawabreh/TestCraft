import type { Metadata } from 'next'
import { Route } from 'lucide-react'
import { resolveLocale } from '@/lib/locale'
import { getPublicViewer, readCatalog } from '@/lib/learning-catalog/data'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { marketingCopy } from '@/components/marketing/copy'
import { PathGrid } from '@/components/marketing/path-grid'
import s from '@/components/marketing/marketing.module.css'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = marketingCopy(resolveLocale((await params).locale))
  return { title: t.paths, description: t.listingBody }
}

export default async function LearningPathsPage({ params }: Props) {
  const locale = resolveLocale((await params).locale)
  const t = marketingCopy(locale)
  const [paths] = await Promise.all([readCatalog(), getPublicViewer()])
  return (
    <MarketingShell locale={locale} suffix="/learning-paths">
      <section className={s.listingHero} aria-labelledby="catalog-title">
        <div className={s.listingHeroInner}>
          <p className={s.eyebrow}><Route size={16} aria-hidden="true" />{t.previewTag}</p>
          <h1 id="catalog-title">{t.listingTitle}</h1>
          <p className={s.lead}>{t.listingBody}</p>
        </div>
      </section>
      <section className={s.section} aria-label={t.paths}><PathGrid paths={paths} locale={locale} /></section>
    </MarketingShell>
  )
}
