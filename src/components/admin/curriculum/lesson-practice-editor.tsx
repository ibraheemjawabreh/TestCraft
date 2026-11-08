'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityEditor } from './activity-editor'
import type { Activity } from '@/lib/curriculum/content.schema'
import type { Dictionary } from '@/i18n/types'

export function LessonPracticeEditor({ lessonId, initial, updatedAt, published, locale, dictionary }: { lessonId: string; initial: Activity[]; updatedAt: string; published: boolean; locale: 'en' | 'ar'; dictionary: Dictionary }) {
  const [value, setValue] = useState(initial), [language, setLanguage] = useState(locale)
  const [revision, setRevision] = useState(updatedAt), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const router = useRouter(), ar = locale === 'ar'
  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/curriculum/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lesson_id: lessonId, expected_updated: revision, practice: value }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error + (result.details ? '\n' + result.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n') : ''))
      setRevision(result.data.updated_at); setMessage(ar ? 'تم حفظ التمارين كمسودة.' : 'Exercises saved as drafts.'); router.refresh()
    } catch (error) { setMessage(String(error)) } finally { setBusy(false) }
  }
  return <section id="practice" className="admin-surface rounded-xl p-5 space-y-4">
    <h2 className="font-heading text-xl font-bold">{ar ? 'تمارين الدرس وشروح الإجابات' : 'Lesson exercises and explanations'}</h2>
    <div className="flex gap-2"><button className="rounded border px-3 py-1 text-sm" onClick={() => setLanguage('en')}>English</button><button className="rounded border px-3 py-1 text-sm" onClick={() => setLanguage('ar')}>العربية</button></div>
    {published && <p className="text-sm text-muted-foreground">{ar ? 'ألغِ نشر الدرس قبل تعديل التمارين.' : 'Unpublish the lesson before editing exercises.'}</p>}
    <fieldset disabled={published || busy}><ActivityEditor value={value} onChange={setValue} dictionary={dictionary} language={language} maximum={30} /></fieldset>
    <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={busy || published} onClick={save}>{ar ? 'حفظ التمارين' : 'Save exercises'}</button>
    {message && <p role="status" className="whitespace-pre-wrap text-sm">{message}</p>}
  </section>
}
