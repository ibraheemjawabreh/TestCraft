import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Circle, LockKeyhole } from 'lucide-react'
import { resolveLocale } from '@/lib/locale'
import { getLocalizedContent } from '@/lib/i18n/content'
import { getPublicViewer, readCatalog, readPathStudy } from '@/lib/learning-catalog/data'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { marketingCopy } from '@/components/marketing/copy'
import { PathCounts } from '@/components/marketing/path-grid'
import s from '@/components/marketing/marketing.module.css'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params
  const locale = resolveLocale(raw)
  const [path] = (await readCatalog(slug)) ?? []
  const t = marketingCopy(locale)
  return path ? {
    title: getLocalizedContent(path, 'title', locale), description: getLocalizedContent(path, 'description', locale),
  } : { title: t.paths }
}

export default async function PathDetails({ params }: Props) {
  const { locale: raw, slug } = await params
  const locale = resolveLocale(raw)
  const t = marketingCopy(locale)
  const prefix = '/' + locale
  const suffix = '/learning-paths/' + encodeURIComponent(slug)
  const [paths, viewer] = await Promise.all([readCatalog(slug), getPublicViewer()])
  if (paths === null) return <MarketingShell locale={locale}>
    <section className={s.section}><h1 className={s.eyebrow}>{t.paths}</h1><p className={s.notice} role="status">{t.unavailable}</p></section>
  </MarketingShell>
  const path = paths[0]
  if (!path) notFound()

  const study = viewer ? await readPathStudy(slug, viewer.db) : null
  const completed = new Set(study?.completed)
  const available = new Set(study?.available)
  const format = new Intl.NumberFormat(locale)
  const canLaunch = path.lesson_count > 0 && (!viewer || !!study?.lesson_id)
  const academy = prefix + '/academy?path=' + path.id
  const action = canLaunch ? (study?.started ? t.continue : t.start) : (viewer ? t.academy : t.allPaths)
  const destination = canLaunch ? prefix + suffix + '/start' : (viewer ? academy : prefix + '/learning-paths')
  return (
    <MarketingShell locale={locale}>
      <section className={s.detailHero} aria-labelledby="path-title">
        <div className={s.listingHeroInner}>
          <Link href={prefix + '/learning-paths'} className={s.textLink}><ArrowLeft size={17} className={s.directional} aria-hidden="true" />{t.allPaths}</Link>
          <p className={s.eyebrow}>{t.pathLabel}</p>
          <h1 id="path-title">{getLocalizedContent(path, 'title', locale)}</h1>
          <p className={s.lead}>{getLocalizedContent(path, 'description', locale) || t.noDescription}</p>
          <PathCounts path={path} locale={locale} />
          <div className={s.actions}>
            <a className={s.primary} href={destination}>{action}<ArrowRight className={s.directional} size={17} aria-hidden="true" /></a>
          </div>
        </div>
      </section>
      <div className={s.detailGrid}>
        <section aria-labelledby="course-outline">
          <h2 id="course-outline">{t.outline}</h2>
          <div className={s.outline}>
            {path.modules.map((module, index) => (
              <details key={module.id} open={index === 0}>
                <summary><span className={s.moduleNumber}>{format.format(index + 1)}</span>
                  <span><strong>{getLocalizedContent(module, 'title', locale)}</strong><br /><small>{format.format(module.lessons.length)} {t.lessons}</small></span>
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div className={s.moduleBody}>
                  {getLocalizedContent(module, 'description', locale) && <p>{getLocalizedContent(module, 'description', locale)}</p>}
                  {module.lessons.length ? <ol>{module.lessons.map(lesson => {
                    const status = !study ? null : completed.has(lesson.id) ? 'completed' : available.has(lesson.id) ? 'ready' : 'locked'
                    const Icon = status === 'completed' ? CheckCircle2 : status === 'locked' ? LockKeyhole : Circle
                    return <li className={s.lessonRow} key={lesson.id}>
                      <Icon size={15} aria-hidden="true" />
                      <span className={s.lessonTitle}>{getLocalizedContent(lesson, 'title', locale)}</span>
                      <span className={s.lessonMeta}>{!!lesson.estimated_minutes && <span>{format.format(lesson.estimated_minutes)} {t.minutes}</span>}
                        {status && <span className={s.lessonState} data-state={status}>{t[status]}</span>}</span>
                    </li>
                  })}</ol> : <p>{t.emptyModule}</p>}
                </div>
              </details>
            ))}
            {!path.modules.length && <p className={s.notice}>{t.emptyModule}</p>}
          </div>
        </section>
        <aside className={s.progressPanel}>
          <h2>{viewer ? t.yourProgress : t.overview}</h2>
          {study ? <>
            <p>{format.format(completed.size)} / {format.format(path.lesson_count)} {t.completedLessons}</p>
            <progress aria-label={t.yourProgress} value={completed.size} max={Math.max(1,path.lesson_count)} />
            {!canLaunch && <p>{t.noNext}</p>}
          </> : <p>{viewer ? t.studyUnavailable : t.listingBody}</p>}
        </aside>
      </div>
    </MarketingShell>
  )
}
