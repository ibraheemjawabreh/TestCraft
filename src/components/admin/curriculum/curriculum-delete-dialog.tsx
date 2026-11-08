'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog'
import type { DeletionTarget, DeletionPreview, DeletionResult } from '@/lib/curriculum/deletion-schema'

export function CurriculumDeleteDialog({ target, locale, onClose, onDeleted }: {
  target: DeletionTarget; locale: 'ar' | 'en'; onClose: () => void; onDeleted: (result: DeletionResult) => void
}) {
  const ar = locale === 'ar'
  const [preview, setPreview] = useState<DeletionPreview | null>(null)
  const [confirmation, setConfirmation] = useState(''), [error, setError] = useState('')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [reload, setReload] = useState(0)
  const active = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/admin/curriculum/delete?kind=${target.kind}&id=${target.id}`, { signal: controller.signal, cache: 'no-store', redirect: 'error' })
      .then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.error); return json.data as DeletionPreview })
      .then(setPreview).catch(e => { if (!controller.signal.aborted) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [target.kind, target.id, reload])
  async function remove() {
    if (!preview || confirmation !== preview.slug || active.current) return
    active.current = true; setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/curriculum/delete', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, confirmation, revision: preview.revision }) })
      const json = await response.json()
      if (!response.ok) {
        if (response.status === 409) { setPreview(null); setConfirmation(''); setReload(value => value + 1) }
        throw new Error(json.error)
      }
      onDeleted(json.data)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { active.current = false; setBusy(false) }
  }
  const counts = preview?.counts
  return <AlertDialog open onOpenChange={open => { if (!open && !active.current) onClose() }}>
    <AlertDialogContent dir={ar ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
      <AlertDialogHeader>
        <AlertDialogTitle>{ar ? 'حذف المحتوى التعليمي نهائيًا' : 'Permanently delete educational content'}</AlertDialogTitle>
        <AlertDialogDescription>{ar ? 'سيُحذف العنصر وكل الوحدات والدروس والتمارين التابعة له. ستُحفَظ نسخة احتياطية قبل الحذف.' : 'This removes the selected content and all its modules, lessons and exercises. A backup is saved before deletion.'}</AlertDialogDescription>
      </AlertDialogHeader>
      {loading && <p role="status">{ar ? 'جارٍ حساب أثر الحذف…' : 'Loading deletion preview…'}</p>}
      {preview && !loading && <div className="space-y-3 text-sm">
        <p className="font-semibold">{(ar ? preview.title_ar : preview.title_en) || preview.slug}</p>
        <p>{counts!.paths} {ar ? 'مسارات' : 'paths'} · {counts!.modules} {ar ? 'وحدات' : 'modules'} · {counts!.lessons} {ar ? 'دروس' : 'lessons'} · {counts!.activities} {ar ? 'تمارين' : 'exercises'}</p>
        {(counts!.lesson_progress + counts!.module_progress + counts!.path_progress + counts!.activity_attempts > 0) && <p className="rounded-lg border border-destructive/30 p-3 text-destructive">{ar
          ? `سيُزال أيضًا ${counts!.lesson_progress + counts!.module_progress + counts!.path_progress} سجل تقدّم و${counts!.activity_attempts} محاولة تمرين مرتبطة بهذا المحتوى، وستُحفَظ في النسخة الاحتياطية. حسابات الطلاب ونقاط XP لا تتغير.`
          : `${counts!.lesson_progress + counts!.module_progress + counts!.path_progress} related progress records and ${counts!.activity_attempts} exercise attempts will also be removed and included in the backup. Student accounts and XP remain unchanged.`}</p>}
        {!!counts!.linked_challenges && <p>{ar ? `ستبقى التحديات (${counts!.linked_challenges}) محفوظة، مع فك روابطها بالمحتوى المحذوف.` : `${counts!.linked_challenges} linked challenges will be retained; their links to deleted content will be cleared.`}</p>}
        {!!counts!.prerequisite_links && <p>{ar ? `ستُزال ${counts!.prerequisite_links} روابط متطلبات سابقة مرتبطة بالدروس المحذوفة.` : `${counts!.prerequisite_links} prerequisite links involving removed lessons will be cleared.`}</p>}
        <label className="block space-y-2">
          <span>{ar ? 'اكتب الاسم التقني التالي (slug) للتأكيد:' : 'Type this exact slug to confirm:'} <code dir="ltr">{preview.slug}</code></span>
          <input aria-label={ar ? 'تأكيد الحذف' : 'Deletion confirmation'} autoComplete="off" dir="ltr" className="w-full rounded-lg border border-border bg-background px-3 py-2" disabled={busy} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
        </label>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy} onClick={onClose}>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
        <button type="button" className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50" disabled={loading || busy || !preview || confirmation !== preview.slug} onClick={remove}>
          {busy ? (ar ? 'جارٍ الحذف…' : 'Deleting…') : (ar ? 'حذف نهائي' : 'Delete permanently')}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
