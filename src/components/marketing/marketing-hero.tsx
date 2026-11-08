import Link from 'next/link'
import { ArrowRight, BookOpen, FlaskConical, Play, Route } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { marketingCopy } from './copy'
import { TestRunDemo } from './test-run-demo'
import s from './marketing.module.css'

export function MarketingHero({ locale }: { locale: Locale }) {
  const t = marketingCopy(locale)
  const prefix = '/' + locale
  const icons = [BookOpen, FlaskConical, Route]
  return (
    <section className={s.hero} aria-labelledby="hero-heading">
      <div className={s.heroGrid}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}><span className={s.signal} />{t.heroTag}</p>
          <h1 id="hero-heading">{t.heroLine}<span>{t.heroAccent}</span></h1>
          <p className={s.lead}>{t.heroBody}</p>
          <div className={s.actions}>
            <Link className={s.primary} href={prefix + '/learning-paths'}>{t.explore}<ArrowRight className={s.directional} size={18} aria-hidden="true" /></Link>
            <a className={s.secondary} href={prefix + '/learn'}><Play size={16} aria-hidden="true" />{t.continue}</a>
          </div>
          <ul className={s.skills}>
            {t.skills.map((skill, i) => { const Icon = icons[i]; return <li key={skill}><Icon size={15} aria-hidden="true" />{skill}</li> })}
          </ul>
        </div>
        <TestRunDemo copy={{
          example: t.demo, window: t.demoWindow, title: t.demoTitle, cases: t.demoCases,
          expected: t.demoExpected, observed: t.demoObserved, rows: t.demoRows, pass: t.pass, fail: t.fail, note: t.demoNote,
        }} />
      </div>
    </section>
  )
}
