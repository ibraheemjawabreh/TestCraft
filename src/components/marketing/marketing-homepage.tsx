import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowRight, BookOpen, Bug, CheckCircle2, FlaskConical, ListChecks } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { readCatalog } from '@/lib/learning-catalog/data'
import { MarketingShell } from './marketing-shell'
import { MarketingHero } from './marketing-hero'
import { PathGrid } from './path-grid'
import { marketingCopy } from './copy'
import s from './marketing.module.css'

async function PathPreview({ locale }: { locale: Locale }) {
  const paths = await readCatalog()
  return <PathGrid paths={paths?.slice(0,3) ?? null} locale={locale} />
}

export function MarketingHomepage({ locale }: { locale: Locale }) {
  const t = marketingCopy(locale)
  const listing = '/' + locale + '/learning-paths'
  const stepIcons = [BookOpen, FlaskConical, CheckCircle2]
  return (
    <MarketingShell locale={locale} publicOnly>
      <MarketingHero locale={locale} />
      <section className={s.section} aria-labelledby="path-preview">
        <div className={s.sectionHeader}>
          <div><p className={s.eyebrow}>{t.previewTag}</p><h2 id="path-preview">{t.previewTitle}</h2><p>{t.previewBody}</p></div>
          <Link className={s.textLink} href={listing}>{t.allPaths}<ArrowRight size={17} className={s.directional} aria-hidden="true" /></Link>
        </div>
        <Suspense fallback={<p className={s.notice} role="status">{locale === 'ar' ? 'جارٍ تحميل المسارات…' : 'Loading published paths…'}</p>}>
          <PathPreview locale={locale} />
        </Suspense>
      </section>
      <section className={s.band} aria-labelledby="learning-loop">
        <div className={s.section}>
          <div className={s.sectionHeader}><div><p className={s.eyebrow}>{t.howTag}</p><h2 id="learning-loop">{t.howTitle}</h2></div></div>
          <ol className={s.steps}>
            {t.steps.map(([title, body], i) => { const Icon = stepIcons[i]; return (
              <li className={s.reveal} key={title}>
                <span className={s.stepNumber} aria-hidden="true">0{i+1}</span>
                <Icon size={24} aria-hidden="true" /><h3>{title}</h3><p>{body}</p>
              </li>
            ) })}
          </ol>
        </div>
      </section>
      <section className={s.section} aria-labelledby="practical-challenges">
        <div className={s.lab}>
          <div><p className={s.eyebrow}><Bug size={16} aria-hidden="true" />{t.labTag}</p>
            <h2 id="practical-challenges">{t.labTitle}</h2><p className={s.lead}>{t.labBody}</p>
            <Link className={s.textLink} href={listing}>{t.explore}<ArrowRight size={17} className={s.directional} aria-hidden="true" /></Link>
          </div>
          <div className={s.issueCard}>
            <p className={s.eyebrow}><ListChecks size={17} aria-hidden="true" />{t.labCase}</p><h3>{t.labIssue}</h3>
            <dl><div><dt>{t.demoExpected}</dt><dd>{t.labExpected}</dd></div><div><dt>{t.demoObserved}</dt><dd>{t.labObserved}</dd></div></dl>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
