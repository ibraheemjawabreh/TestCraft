import { z } from 'zod'

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140)
const bilingual = { title_en: z.string().trim().min(3).max(120), title_ar: z.string().trim().min(3).max(120) }
const objectives = z.array(z.string().trim().min(8).max(160)).min(3).max(5)
const lesson = z.object({
  lesson_slug: slug, ...bilingual, sort_order: z.number().int().nonnegative(),
  objectives_en: objectives, objectives_ar: objectives,
  prerequisites: z.array(z.string()).default([]),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
}).strict()
const moduleSchema = z.object({
  module_slug: slug, ...bilingual, sort_order: z.number().int().nonnegative(),
  description_en: z.string().min(10), description_ar: z.string().min(10),
  practical_challenge_slug: slug.nullable().default(null),
  lessons: z.array(lesson).min(1),
}).strict()
const path = z.object({
  path_slug: slug, ...bilingual, sort_order: z.number().int().nonnegative(),
  description_en: z.string().min(10), description_ar: z.string().min(10),
  modules: z.array(moduleSchema).min(1),
}).strict()

export const curriculumManifestSchema = z.object({
  version: z.literal(1),
  source: z.object({ name: z.string().min(5), location: z.string().min(5),
    canonical: z.boolean(), note: z.string().min(10) }).strict(),
  paths: z.array(path).min(1).max(100),
}).strict().superRefine((m, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  const unique = (values: (string | number)[], scope: string) => {
    if (new Set(values).size !== values.length) fail('Duplicate slug or sort_order in ' + scope)
  }
  unique(m.paths.map(p => p.path_slug), 'paths')
  unique(m.paths.map(p => p.sort_order), 'paths')
  const entries = flattenManifest(m)
  const positions = new Map(entries.map((l, i) => [l.key, i]))
  for (const p of m.paths) {
    unique(p.modules.map(x => x.module_slug), p.path_slug)
    unique(p.modules.map(x => x.sort_order), p.path_slug)
    // Existing database constraint is (learning_path_id, slug).
    unique(p.modules.flatMap(x => x.lessons.map(l => l.lesson_slug)), p.path_slug + '/lessons')
    for (const mod of p.modules) unique(mod.lessons.map(x => x.sort_order), p.path_slug + '/' + mod.module_slug)
  }
  entries.forEach((l, i) => {
    unique(l.prerequisites, l.key + '/prerequisites')
    for (const key of l.prerequisites) {
      if (!positions.has(key)) fail('Unknown prerequisite ' + key + ' for ' + l.key)
      else if (positions.get(key)! >= i) fail('Prerequisite must precede lesson: ' + key + ' -> ' + l.key)
    }
  })
})
export type CurriculumManifest = z.infer<typeof curriculumManifestSchema>
type ManifestInput = { paths: z.infer<typeof path>[] }
export function flattenManifest(manifest: ManifestInput) {
  return [...manifest.paths].sort((a,b) => a.sort_order-b.sort_order).flatMap(p =>
    [...p.modules].sort((a,b) => a.sort_order-b.sort_order).flatMap(mod => {
      const lessons = [...mod.lessons].sort((a,b) => a.sort_order-b.sort_order)
      return lessons.map((l, i) => ({
        ...l, key: [p.path_slug, mod.module_slug, l.lesson_slug].join('/'),
        path_slug: p.path_slug, module_slug: mod.module_slug,
        module_title_en: mod.title_en, module_title_ar: mod.title_ar,
        previous_key: i ? [p.path_slug, mod.module_slug, lessons[i-1].lesson_slug].join('/') : null,
        next_key: i+1 < lessons.length ? [p.path_slug, mod.module_slug, lessons[i+1].lesson_slug].join('/') : null,
        previous_title_en: i ? lessons[i-1].title_en : null,
        previous_title_ar: i ? lessons[i-1].title_ar : null,
        next_title_en: i+1 < lessons.length ? lessons[i+1].title_en : null,
        next_title_ar: i+1 < lessons.length ? lessons[i+1].title_ar : null,
      }))
    }))
}
export type ManifestLesson = ReturnType<typeof flattenManifest>[number]

// RFC4180 subset with quoted cells/newlines; one row per lesson.
export function parseManifestCSV(csv: string): CurriculumManifest {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false
  for (let i=0; i<csv.length; i++) {
    const c = csv[i]
    if (c === '"') { if (quoted && csv[i+1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (!quoted && c === ',') { row.push(cell); cell = '' }
    else if (!quoted && c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (quoted) throw new Error('Unclosed CSV quote')
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  const headers = rows.shift()?.map(x => x.replace(/^\uFEFF/, '').trim()) || []
  const required = ['path_slug','path_title_en','path_title_ar','path_order','path_description_en','path_description_ar',
    'module_slug','module_title_en','module_title_ar','module_order','module_description_en','module_description_ar',
    'lesson_slug','title_en','title_ar','sort_order','objectives_en','objectives_ar']
  for (const h of required) if (!headers.includes(h)) throw new Error('Missing CSV column: ' + h)
  const paths: z.infer<typeof path>[] = []
  for (const values of rows.filter(r => r.some(Boolean))) {
    if (values.length !== headers.length) throw new Error('CSV column count mismatch')
    const r = Object.fromEntries(headers.map((h,i) => [h, values[i]]))
    let p = paths.find(x => x.path_slug === r.path_slug)
    const pData = { path_slug: r.path_slug, title_en:r.path_title_en, title_ar:r.path_title_ar, sort_order:Number(r.path_order),
      description_en:r.path_description_en, description_ar:r.path_description_ar }
    if (!p) { p = { ...pData, modules:[] }; paths.push(p) }
    else for (const k of Object.keys(pData) as (keyof typeof pData)[]) if (p[k] !== pData[k]) throw new Error('Conflicting path metadata: ' + r.path_slug)
    let mod = p.modules.find(x => x.module_slug === r.module_slug)
    const mData = { module_slug:r.module_slug, title_en:r.module_title_en, title_ar:r.module_title_ar, sort_order:Number(r.module_order),
      description_en:r.module_description_en, description_ar:r.module_description_ar, practical_challenge_slug:r.practical_challenge_slug || null }
    if (!mod) { mod = { ...mData, lessons:[] }; p.modules.push(mod) }
    else for (const k of Object.keys(mData) as (keyof typeof mData)[]) if (mod[k] !== mData[k]) throw new Error('Conflicting module metadata: ' + r.module_slug)
    mod.lessons.push({ lesson_slug:r.lesson_slug, title_en:r.title_en, title_ar:r.title_ar, sort_order:Number(r.sort_order),
      objectives_en:r.objectives_en.split('|'), objectives_ar:r.objectives_ar.split('|'),
      prerequisites:r.prerequisites ? r.prerequisites.split('|') : [], difficulty:(r.difficulty || 'Beginner') as 'Beginner' })
  }
  return curriculumManifestSchema.parse({version:1, source:{name:'Administrator CSV import',location:'uploaded CSV',
    canonical:false,note:'Verify this source against the approved Master Curriculum before production.'},paths})
}

