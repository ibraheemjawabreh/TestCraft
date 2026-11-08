import Link from 'next/link'
import { ArrowRight, BookOpen, Layers3, Route, ScanLine, Terminal } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { getLocalizedContent } from '@/lib/i18n/content'
import type { CatalogPath } from '@/lib/learning-catalog/data'
import { marketingCopy } from './copy'
import s from './marketing.module.css'

export function PathCounts({ path, locale }: { path: CatalogPath; locale: Locale }) {
  const t = marketingCopy(locale)
  const format = new Intl.NumberFormat(locale)
  return <ul className={s.counts}>
    <li><Layers3 size={16} aria-hidden="true" />{format.format(path.module_count)} {t.modules}</li>
    <li><BookOpen size={16} aria-hidden="true" />{format.format(path.lesson_count)} {t.lessons}</li>
  </ul>
}

export function PathGrid({ paths, locale }: { paths: CatalogPath[] | null; locale: Locale }) {
  const t = marketingCopy(locale)
  const icons = [Route, ScanLine, Terminal]
  if (!paths?.length) return <p className={s.notice} role={paths === null ? 'status' : undefined}>{paths === null ? t.unavailable : t.empty}</p>
  return <div className={s.pathGrid}>
    {paths.map((path, i) => {
      const Icon = icons[i % icons.length]
      const title = getLocalizedContent(path, 'title', locale)
      const href = '/' + locale + '/learning-paths/' + encodeURIComponent(path.slug)
      return <article key={path.id} className={s.pathCard + ' ' + s.reveal}>
        <div className={s.cardTop}><span className={s.pathIcon}><Icon size={23} aria-hidden="true" /></span>
          <span aria-hidden="true" dir="ltr">{String(i + 1).padStart(2, '0')}</span></div>
        <h3>{title}</h3>
        <p>{getLocalizedContent(path, 'description', locale) || t.noDescription}</p>
        <PathCounts path={path} locale={locale} />
        <Link className={s.cardLink} href={href} prefetch={false} aria-label={t.viewPath + ': ' + title}>
          {t.viewPath}<ArrowRight size={17} className={s.directional} aria-hidden="true" />
        </Link>
      </article>
    })}
  </div>
}
