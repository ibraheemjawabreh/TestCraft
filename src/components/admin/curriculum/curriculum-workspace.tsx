'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { CurriculumDeleteDialog } from './curriculum-delete-dialog'
import { downloadCurriculum } from './import-curriculum'
import type { DeletionTarget, DeletionResult } from '@/lib/curriculum/deletion-schema'
import { CurriculumModals } from './CurriculumModals'
import { setCurriculumState, reorderPaths, reorderModules, reorderLessons, type CurriculumPath, type CurriculumModule, type CurriculumLesson, type CurriculumStats } from '@/lib/admin/curriculum'
import type { Dictionary } from '@/i18n/types'
type Entity = CurriculumPath | CurriculumModule | CurriculumLesson
type Kind = 'path' | 'module' | 'lesson'

export function CurriculumWorkspace({ paths, stats, locale, dictionary, readOnly = false }: { paths: CurriculumPath[]; stats: CurriculumStats; locale: 'en' | 'ar'; dictionary: Dictionary; readOnly?: boolean }) {
  const ar = locale === 'ar', router = useRouter()
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeletionTarget | null>(null)
  const [deleted, setDeleted] = useState<DeletionResult | null>(null)
  const [modal, setModal] = useState<{ kind: 'path' | 'module'; mode: 'create' | 'edit'; data?: any } | null>(null)
  const btn = 'rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-50'
  const status = (e: Entity) => e.archived_at ? 'archived' : ('is_active' in e ? e.is_active : e.is_published) ? 'published' : 'draft'
  const matches = (e: Entity) => (!query || [e.title_en, e.title_ar, e.slug].some(s => s?.toLowerCase().includes(query.toLowerCase()))) && (filter === 'all' || filter === status(e))
  async function perform(action: () => Promise<{ error: string | null }>) {
    if (readOnly) return
    setBusy(true); setError('')
    try { const result = await action(); if (result.error) setError(result.error); else router.refresh() }
    catch (e) { setError(String(e)) } finally { setBusy(false) }
  }
  function move(kind: Kind, items: Entity[], index: number, delta: number) {
    const ids = items.map(x => x.id), other = index + delta
    if (other < 0 || other >= ids.length) return
    ;[ids[index], ids[other]] = [ids[other], ids[index]]
    void perform(() => kind === 'path' ? reorderPaths(ids) : kind === 'module' ? reorderModules(ids) : reorderLessons(ids))
  }
  function controls(kind: Kind, e: Entity, items: Entity[], index: number) {
    if (readOnly) return <span className="text-xs text-muted-foreground">{ar ? ({ draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' }[status(e)]) : status(e)}</span>
    return <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{ar ? ({ draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' }[status(e)]) : status(e)}</span>
      <button className={btn} disabled={busy || index === 0} aria-label={`Move ${e.slug} up`} onClick={() => move(kind, items, index, -1)}><ArrowUp size={14} /></button>
      <button className={btn} disabled={busy || index === items.length - 1} aria-label={`Move ${e.slug} down`} onClick={() => move(kind, items, index, 1)}><ArrowDown size={14} /></button>
      {kind === 'lesson' ? <>
        <Link className={btn} href={`/${locale}/admin/lessons/${e.id}/edit`}>{ar ? 'تحرير' : 'Edit'}</Link>
        <Link className={btn} href={`/${locale}/admin/lessons/${e.id}`}>{ar ? 'معاينة' : 'Preview'}</Link>
      </> : <button className={btn} disabled={busy} onClick={() => setModal({ kind, mode: 'edit', data: e })}>{ar ? 'تحرير' : 'Edit'}</button>}
      <button className={btn} disabled={busy} onClick={() => perform(() => setCurriculumState(kind, e.id, status(e) === 'published' ? 'draft' : status(e) === 'archived' ? 'draft' : 'published'))}>
        {status(e) === 'archived' ? (ar ? 'استعادة كمسودة' : 'Restore as draft') : status(e) === 'published' ? (ar ? 'إلغاء النشر' : 'Unpublish') : (ar ? 'نشر' : 'Publish')}
      </button>
      {status(e) !== 'archived' && <button className={btn} disabled={busy} title={ar ? 'أرشفة' : 'Archive'} aria-label={`Archive ${e.slug}`} onClick={() => perform(() => setCurriculumState(kind, e.id, 'archived'))}><Archive size={14} /></button>}
      <button type="button" className={btn + ' text-destructive'} disabled={busy} aria-label={ar ? `حذف ${e.slug}` : `Delete ${kind} ${e.slug}`} onClick={() => { setError(''); setDeleted(null); setDeleteTarget({ kind, id: e.id }) }}><Trash2 size={14} className="inline" /> {ar ? 'حذف' : 'Delete'}</button>
    </div>
  }
  const visiblePaths = paths.filter(p => matches(p) || p.modules.some(m => matches(m) || m.lessons.some(matches)))
  return <section className="space-y-4" aria-label="Curriculum manager">
    <div className="grid grid-cols-3 gap-3">{[[ar ? 'المسارات' : 'Paths', stats.totalPaths], [ar ? 'الوحدات' : 'Modules', stats.totalModules], [ar ? 'الدروس' : 'Lessons', stats.totalLessons]].map(([label, count]) => <div className="admin-surface rounded-xl p-4" key={label}><p className="text-2xl font-bold">{count}</p><p className="text-sm text-muted-foreground">{label}</p></div>)}</div>
    <div className="flex flex-wrap gap-3">
      <input aria-label="Search curriculum" className="min-w-48 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={ar ? 'ابحث بالعنوان أو slug' : 'Search by title or slug'} value={query} onChange={e => setQuery(e.target.value)} />
      <select className={btn} aria-label="Filter curriculum status" value={filter} onChange={e => setFilter(e.target.value)}>{['all', 'draft', 'published', 'archived'].map(s => <option key={s} value={s}>{ar ? ({ all: 'الكل', draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' }[s]) : s}</option>)}</select>
      <button className={btn} disabled={busy || readOnly} onClick={() => setModal({ kind: 'path', mode: 'create' })}><Plus className="inline h-4 w-4" /> {ar ? 'إنشاء مسار' : 'Create path'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {deleted && <div role="status" className="rounded-lg border border-border p-3 text-sm space-y-2">
      <p>{ar ? 'تم حذف المحتوى وحفظ نسخة احتياطية.' : 'Content deleted. A backup was saved.'}</p>
      <button className={btn} disabled={busy} onClick={() => perform(async () => { await downloadCurriculum('backup', deleted.backup_id); return { error: null } })}>{ar ? 'تنزيل نسخة ما قبل الحذف' : 'Download pre-deletion backup'}</button>
    </div>}
    {!visiblePaths.length && <p className="p-8 text-center text-muted-foreground">{ar ? 'لا توجد نتائج. استورد المنهج أو أنشئ مسارًا.' : 'No matching content. Import a curriculum or create a path.'}</p>}
    {visiblePaths.map(p => <div key={p.id} className="admin-surface rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{ar ? p.title_ar : p.title_en}</h3><p className="text-xs text-muted-foreground">{p.slug} · {p.modules.length} {ar ? 'وحدات' : 'modules'} · {p.modules.reduce((n, m) => n + m.lessons.length, 0)} {ar ? 'دروس' : 'lessons'}</p></div>{controls('path', p, paths, paths.indexOf(p))}</div>
      <button className={btn} disabled={busy || readOnly} onClick={() => setModal({ kind: 'module', mode: 'create', data: { pathId: p.id } })}>{ar ? 'إضافة وحدة' : 'Add module'}</button>
      {p.modules.filter(m => matches(m) || m.lessons.some(matches) || (!!query && matches(p))).map(m => <details key={m.id} className="rounded-xl border border-border p-3" open={!!query || filter !== 'all'}>
        <summary className="cursor-pointer text-sm font-semibold">{ar ? m.title_ar : m.title_en} <span className="font-normal text-muted-foreground">· {m.lessons.length} {ar ? 'دروس' : 'lessons'}</span></summary>
        <div className="pt-3 space-y-3">{controls('module', m, p.modules, p.modules.indexOf(m))}
          {m.lessons.filter(l => matches(l) || (!!query && (matches(p) || matches(m)))).map(l => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 py-3"><div className="min-w-0"><p className="text-sm font-medium">{ar ? l.title_ar : l.title_en}</p><p className="text-xs text-muted-foreground">{l.slug} · {l.estimated_minutes} {ar ? 'دقيقة' : 'min'}</p></div>{controls('lesson', l, m.lessons, m.lessons.indexOf(l))}</div>)}
          {!readOnly && <Link className={btn + ' inline-block'} href={`/${locale}/admin/lessons/new?pathId=${p.id}&moduleId=${m.id}`}>{ar ? 'إضافة درس' : 'Add lesson'}</Link>}
        </div>
      </details>)}
    </div>)}
    <CurriculumModals isOpen={!!modal} onClose={() => setModal(null)} modalType={modal?.kind ?? null} mode={modal?.mode ?? 'create'} contextData={modal?.data} paths={paths} locale={locale} dictionary={dictionary} onSuccess={() => router.refresh()} />
    {deleteTarget && <CurriculumDeleteDialog key={deleteTarget.kind + deleteTarget.id} target={deleteTarget} locale={locale} onClose={() => setDeleteTarget(null)} onDeleted={result => { setDeleted(result); setDeleteTarget(null); router.refresh() }} />}
  </section>
}
