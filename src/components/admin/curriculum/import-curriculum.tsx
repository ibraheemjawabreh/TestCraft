'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ImportChange } from '@/lib/curriculum/import-service'
import type { CurriculumDocument } from '@/lib/curriculum/import-schema'
import { curriculumDownloadNames, type CurriculumDownload } from '@/lib/curriculum/downloads'

export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const endpoint = '/api/admin/curriculum/import'
export async function downloadCurriculum(file: CurriculumDownload, backupId?: string) {
  const response = await fetch(`/api/admin/curriculum/download?file=${file}${backupId ? `&id=${encodeURIComponent(backupId)}` : ''}`, {
    method: file === 'backup' && !backupId ? 'POST' : 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin', cache: 'no-store', redirect: 'error',
  })
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('The download returned a page instead of JSON. Reload the page and check your session.')
  }
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || `Download failed (${response.status}).`)
  downloadJSON(json, curriculumDownloadNames[file])
}
export async function importRequest(body: unknown) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error + (json.details ? '\n' + json.details.slice(0, 20).map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n') : ''))
  return json.data
}
type Preview = { document: CurriculumDocument; revision: string; counts: { paths: number; modules: number; lessons: number }; create: Record<string, number>; preserved: number; changes: ImportChange[]; conflicts: ImportChange[] }
type Report = { source_id: string; backup_id: string; inserted_paths: number; inserted_modules: number; inserted_lessons: number; kept_existing: number; processed: number; total: number; done: boolean; results: { key: string; action: string }[] }
export function ImportCurriculum({ locale, ready = true }: { locale: 'en' | 'ar'; ready?: boolean }) {
  const ar = locale === 'ar'
  const router = useRouter()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const active = useRef(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const button = 'rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50'
  async function run(fn: () => Promise<void>) {
    if (active.current) return
    active.current = true; setBusy(true); setError('')
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { active.current = false; setBusy(false) }
  }
  function change(value: string) { setText(value); setPreview(null); setReport(null); setError('') }
  async function commit() {
    if (!preview || !ready) return
    await run(async () => {
      const start = await importRequest({ action: 'prepare', payload: preview.document, revision: preview.revision })
      const next: Report = { ...start, inserted_paths: 0, inserted_modules: 0, inserted_lessons: 0, kept_existing: 0, processed: 0, total: preview.counts.lessons, done: false, results: [] }
      setReport({ ...next }); setPreview(null)
      let offset = 0
      try {
        do {
          const batch = await importRequest({ action: 'batch', source_id: start.source_id, offset })
          for (const key of ['inserted_paths', 'inserted_modules', 'inserted_lessons', 'kept_existing', 'processed'] as const) next[key] += batch[key]
          next.results.push(...batch.results); next.done = batch.done
          offset = batch.next_offset
          setReport({ ...next, results: [...next.results] })
        } while (!next.done)
      } finally { router.refresh() }
    })
  }
  return <section className="admin-surface rounded-2xl p-5 space-y-4" aria-labelledby="import-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="import-title" className="font-heading text-xl font-bold">{ar ? 'استيراد المنهج' : 'Import Curriculum'}</h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={busy} onClick={() => run(() => downloadCurriculum('schema'))}>{ar ? 'مخطط JSON' : 'JSON schema'}</button>
        <button type="button" className={button} disabled={busy} onClick={() => run(() => downloadCurriculum('example'))}>{ar ? 'تنزيل المثال' : 'Download example'}</button>
        <button type="button" className={button} disabled={busy || !ready} onClick={() => run(() => downloadCurriculum('export'))}>{ar ? 'تصدير المنهج' : 'Export curriculum'}</button>
        <button type="button" className={button} disabled={busy} onClick={() => run(() => downloadCurriculum('backup'))}>{ar ? 'تنزيل نسخة احتياطية' : 'Download backup'}</button>
      </div>
    </div>
    <p className="text-sm text-muted-foreground">{ar ? 'ارفع ملف JSON يحتوي على المسارات والوحدات والدروس باللغتين. راجع التغييرات ثم استورد. الدروس الجديدة مسودات، والمحتوى الموجود محفوظ دون استبدال.' : 'Upload nested paths → modules → lessons in English and Arabic. Review changes before importing. New content starts as Draft; existing content is preserved.'}</p>
    <label className="block space-y-2 text-sm font-medium">
      <span>{ar ? 'ملف المنهج (حتى 25 ميجابايت)' : 'Curriculum file (up to 25 MB)'}</span>
      <input type="file" accept=".json,application/json" disabled={busy} className="block w-full text-sm" onChange={e => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 24_000_000) { setPreview(null); setError('File exceeds the 24 MB upload limit (25 MB request limit).'); return }
        void run(async () => change(await file.text()))
      }} />
    </label>
    <label className="block text-sm font-medium space-y-2">
      <span>{ar ? 'أو الصق JSON' : 'Or paste JSON'}</span>
      <textarea aria-label="Curriculum JSON" dir="ltr" className="min-h-36 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs" value={text} disabled={busy} onChange={e => change(e.target.value)} />
    </label>
    <button className={button} disabled={busy || !ready || !text.trim()} onClick={() => run(async () => {
      setPreview(null); setReport(null)
      const payload = JSON.parse(text)
      setPreview(await importRequest({ action: 'preview', payload }))
    })}>{busy ? (ar ? 'جارٍ التنفيذ…' : 'Working…') : (ar ? 'التحقق ومعاينة التغييرات' : 'Validate and preview')}</button>
    {error && <div role="alert" className="whitespace-pre-wrap rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}{report && <p className="mt-2">{ar ? 'قد تكون دفعات سابقة قد حُفظت. أعد استيراد نفس الملف بأمان؛ لن تتكرر الدروس. احتفظ بتقرير النتائج.' : 'Earlier batches may have been saved. Re-import the same file safely to finish; existing lessons will be kept. Download the results for your records.'}</p>}</div>}
    {preview && <div className="space-y-3" aria-label="Import preview">
      <p className="font-semibold">{preview.counts.paths} {ar ? 'مسارات' : 'paths'} · {preview.counts.modules} {ar ? 'وحدات' : 'modules'} · {preview.counts.lessons} {ar ? 'دروس' : 'lessons'}</p>
      <p className="text-sm">{ar ? 'سيتم إنشاء' : 'To create'}: {preview.create.paths} / {preview.create.modules} / {preview.create.lessons}. {ar ? 'تغييرات محفوظة دون استبدال' : 'Existing differences kept'}: {preview.preserved}. {ar ? 'تعارضات' : 'Conflicts'}: {preview.conflicts.length}.</p>
      <div className="max-h-64 overflow-auto rounded-lg border border-border">
        <table className="w-full text-start text-xs"><thead><tr className="border-b"><th className="p-2 text-start">{ar ? 'المحتوى' : 'Content'}</th><th className="p-2 text-start">{ar ? 'الإجراء' : 'Proposed action'}</th></tr></thead>
          <tbody>{preview.changes.map(c => <tr key={c.kind + c.key} className="border-b border-border/30"><td className="p-2 break-all" dir="ltr">{c.kind}: {c.key}</td><td className="p-2">{c.action}{c.reason && <p className="text-muted-foreground">{c.reason}</p>}</td></tr>)}</tbody></table>
      </div>
      <button className={button + ' bg-primary text-primary-foreground'} disabled={busy || !ready || !!preview.conflicts.length} onClick={commit}>{ar ? 'استيراد كمسودات' : 'Import as drafts'}</button>
    </div>}
    {report && <div role="status" className="rounded-lg border border-primary/25 p-4 space-y-2">
      <p className="font-semibold">{report.done ? (ar ? 'اكتمل الاستيراد' : 'Import complete') : (ar ? 'تقدم الاستيراد' : 'Import progress')}: {report.processed}/{report.total}</p>
      <progress className="w-full" max={Math.max(report.total, 1)} value={report.done && !report.total ? 1 : report.processed} />
      <p className="text-sm">{ar ? 'تم إنشاء' : 'Created'}: {report.inserted_paths} {ar ? 'مسارات' : 'paths'}, {report.inserted_modules} {ar ? 'وحدات' : 'modules'}, {report.inserted_lessons} {ar ? 'دروس' : 'lessons'}. {ar ? 'دروس موجودة محفوظة' : 'Existing lessons kept'}: {report.kept_existing}.</p>
      <button className={button} onClick={() => downloadJSON(report, 'curriculum-import-results.json')}>{ar ? 'تنزيل تقرير النتائج' : 'Download results'}</button>
    </div>}
  </section>
}
