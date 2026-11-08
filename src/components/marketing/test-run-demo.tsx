'use client'

import { useState } from 'react'
import { CheckCircle2, CircleX, Terminal } from 'lucide-react'
import s from './marketing.module.css'

interface Copy {
  example: string; window: string; title: string; cases: string[]
  expected: string; observed: string; rows: string[][]; pass: string; fail: string; note: string
}

export function TestRunDemo({ copy }: { copy: Copy }) {
  const [selected, setSelected] = useState(0)
  const passed = selected === 0
  const Status = passed ? CheckCircle2 : CircleX
  return (
    <div className={s.demoFrame}>
      <section className={s.demoPanel} aria-label={copy.example}>
        <div className={s.demoBar}>
          <div className={s.windowDots} aria-hidden="true"><i /><i /><i /></div>
          <span><Terminal size={14} aria-hidden="true" />{copy.window}</span>
        </div>
        <div className={s.demoContent}>
          <p className={s.eyebrow}>{copy.example}</p>
          <h2>{copy.title}</h2>
          <div className={s.caseButtons}>
            {copy.cases.map((label, index) => (
              <button type="button" key={label} aria-pressed={selected === index} onClick={() => setSelected(index)}>{label}</button>
            ))}
          </div>
          <div className={s.demoResult} aria-live="polite">
            <p className={passed ? s.pass : s.fail}><Status size={16} aria-hidden="true" />{passed ? copy.pass : copy.fail}</p>
            <dl><div><dt>{copy.expected}</dt><dd>{copy.rows[selected][0]}</dd></div>
              <div><dt>{copy.observed}</dt><dd>{copy.rows[selected][1]}</dd></div></dl>
          </div>
          <p className={s.demoNote}>{copy.note}</p>
        </div>
      </section>
    </div>
  )
}
