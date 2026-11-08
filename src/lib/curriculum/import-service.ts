import { createHash } from 'node:crypto'
import { ApiError } from '@/lib/auth/api-auth'
import { curriculumImportSchema, curriculumCounts, type CurriculumDocument } from './import-schema'
import { isCurriculumSchemaError, curriculumSetupMessage } from './schema-status'

// Also used by the isolated PostgreSQL integration tests. No provider/API dependency.
export interface CurriculumDB { rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: any; error: { message: string; code?: string } | null }> }
export async function curriculumRPC(db: CurriculumDB, name: string, args?: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args)
  if (error) {
    if (isCurriculumSchemaError(error)) throw new ApiError(503, curriculumSetupMessage)
    throw new ApiError(error.code === '40001' ? 409 : 400, error.message)
  }
  return data
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([k]) => !['id', 'status'].includes(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}'
  return JSON.stringify(value)
}
export type ImportChange = { kind: 'path' | 'module' | 'lesson'; key: string; action: 'create' | 'unchanged' | 'preserve_existing' | 'conflict'; reason?: string }
export function planCurriculum(doc: CurriculumDocument, current: CurriculumDocument) {
  const changes: ImportChange[] = []
  function row(kind: ImportChange['kind'], key: string, incoming: any, existing: any, children?: string) {
    const clean = (v: any) => children ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== children)) : v
    const action = !existing ? 'create' : canonical(clean(incoming)) === canonical(clean(existing)) ? 'unchanged' : 'preserve_existing'
    changes.push({ kind, key, action, ...(action === 'preserve_existing' ? { reason: 'Existing content and ordering will be kept. Edit it in the curriculum manager.' } : {}) })
  }
  for (const p of doc.paths) {
    const oldP = current.paths.find(x => x.slug === p.slug)
    row('path', p.slug, p, oldP, 'modules')
    for (const m of p.modules) {
      const oldM = oldP?.modules.find(x => x.slug === m.slug)
      row('module', p.slug + '/' + m.slug, m, oldM, 'lessons')
      for (const l of m.lessons) {
        const key = p.slug + '/' + m.slug + '/' + l.slug
        const oldL = oldP?.modules.flatMap(x => x.lessons).find(x => x.slug === l.slug)
        if (oldL && !oldM?.lessons.some(x => x.slug === l.slug)) {
          changes.push({ kind: 'lesson', key, action: 'conflict', reason: 'Existing lesson belongs to another module; stable lesson IDs cannot be moved by import.' })
        } else row('lesson', key, l, oldL)
      }
    }
  }
  return { counts: curriculumCounts(doc), changes, conflicts: changes.filter(x => x.action === 'conflict'),
    create: Object.fromEntries(['path', 'module', 'lesson'].map(k => [k + 's', changes.filter(x => x.kind === k && x.action === 'create').length])),
    preserved: changes.filter(x => x.action === 'preserve_existing').length }
}
export async function previewCurriculum(db: CurriculumDB, payload: unknown) {
  const document = curriculumImportSchema.parse(payload)
  const snapshot = await curriculumRPC(db, 'curriculum_export_json')
  return { document, revision: snapshot.revision as string, ...planCurriculum(document, snapshot.document) }
}
export async function prepareCurriculum(db: CurriculumDB, payload: unknown, revision: string) {
  const preview = await previewCurriculum(db, payload)
  if (preview.revision !== revision) throw new ApiError(409, 'Curriculum changed after preview. Preview the file again.')
  if (preview.conflicts.length) throw new ApiError(409, 'Resolve lesson module conflicts before importing.')
  const fingerprint = createHash('sha256').update(JSON.stringify(preview.document)).digest('hex')
  return curriculumRPC(db, 'curriculum_prepare_json', { p_document: preview.document, p_revision: revision, p_fingerprint: fingerprint })
}
