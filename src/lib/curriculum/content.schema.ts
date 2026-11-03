import { z } from 'zod'
import { curriculumManifestSchema, flattenManifest, type ManifestLesson } from './curriculum-manifest.schema'

const textPair = z.object({ en:z.string().trim().min(1), ar:z.string().trim().min(1) }).strict()
export const activitySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/), kind:z.enum(['single_choice','multi_select','true_false','scenario','short_answer']),
  prompt:textPair, options:z.array(z.object({ id:z.string().regex(/^[a-z0-9-]+$/), text:textPair }).strict()).max(6),
  answer:z.array(z.string()), explanation:textPair,
  rubric:z.array(textPair).max(6), sort_order:z.number().int().nonnegative(),
}).strict().superRefine((a,ctx) => {
  const bad = (message:string) => ctx.addIssue({code:'custom',message})
  if (a.prompt.en.length<15 || a.prompt.ar.length<15 || a.explanation.en.length<30 || a.explanation.ar.length<30) bad('Question and feedback need meaningful bilingual text')
  if (a.kind === 'short_answer') {
    if (a.options.length || a.answer.length || a.rubric.length < 2) bad('Short answer requires rubric, no auto-grade key/options')
  } else {
    if (a.options.length < 2 || !a.answer.length) bad('Objective question requires options and an answer')
    if (a.kind !== 'multi_select' && a.answer.length !== 1) bad('Exactly one answer required')
    if (a.kind === 'true_false' && a.options.length !== 2) bad('True/false requires two options')
    if (new Set(a.options.map(o=>o.id)).size !== a.options.length) bad('Duplicate option IDs')
    if (new Set(a.answer).size !== a.answer.length || a.answer.some(id=>!a.options.some(o=>o.id===id))) bad('Unknown/duplicate answer option')
  }
})
export type Activity = z.infer<typeof activitySchema>
export const lessonDraftSchema = z.object({
  key:z.string(), title_en:z.string().min(3).max(120), title_ar:z.string().min(3).max(120),
  summary_en:z.string().min(70).max(600), summary_ar:z.string().min(60).max(600),
  objectives_en:z.array(z.string().min(8).max(160)).min(3).max(5),
  objectives_ar:z.array(z.string().min(8).max(160)).min(3).max(5),
  content_en:z.string().min(2200).max(40000), content_ar:z.string().min(1800).max(40000),
  estimated_minutes:z.number().int().min(5).max(18),
  previous_key:z.string().nullable(), next_key:z.string().nullable(), is_published:z.literal(false),
  activities:z.array(activitySchema).min(1).max(3),
}).strict()
export type LessonDraft = z.infer<typeof lessonDraftSchema>
export const contentBundleSchema = z.object({
  version:z.literal(1), manifest:curriculumManifestSchema,
  lessons:z.array(lessonDraftSchema).min(1),
  module_assessments:z.array(z.object({module_key:z.string(),activities:z.array(activitySchema).min(3).max(10)}).strict()),
}).strict().superRefine((b,ctx) => {
  const specs = flattenManifest(b.manifest)
  const issue = (message:string) => ctx.addIssue({code:'custom',message})
  if (new Set(b.lessons.map(l=>l.key)).size !== b.lessons.length) issue('Duplicate lesson draft')
  for (const l of b.lessons) {
    const spec = specs.find(s=>s.key===l.key)
    if (!spec) { issue('Unknown lesson ' + l.key); continue }
    for (const error of qualityIssues(l,spec)) issue(l.key + ': ' + error)
  }
  const moduleKeys = new Set(specs.map(s=>s.path_slug+'/'+s.module_slug))
  if (new Set(b.module_assessments.map(m=>m.module_key)).size !== b.module_assessments.length) issue('Duplicate module assessment')
  for (const a of b.module_assessments) {
    if (!moduleKeys.has(a.module_key)) issue('Unknown assessment module ' + a.module_key)
    if (new Set(a.activities.map(x=>x.slug)).size !== a.activities.length) issue('Duplicate assessment slugs')
  }
  const bodies = b.lessons.map(l=>l.content_en.trim())
  if (new Set(bodies).size !== bodies.length) issue('Repeated lesson body')
})
export type ContentBundle = z.infer<typeof contentBundleSchema>
export function qualityIssues(l:LessonDraft, spec:ManifestLesson):string[] {
  const issues:string[] = []
  if (l.key!==spec.key || l.title_en!==spec.title_en || l.title_ar!==spec.title_ar) issues.push('Manifest title/key mismatch')
  if (l.previous_key!==spec.previous_key || l.next_key!==spec.next_key) issues.push('Invalid neighbor sequence')
  for (const lang of ['en','ar'] as const) {
    const body = (lang === 'en' ? l.content_en : l.content_ar)
    if (/\b(lorem ipsum|TODO|TBD|placeholder|coming soon)\b|محتوى تجريبي|سيتم إضافة/i.test(body)) issues.push('Placeholder content')
    if ((body.match(/^## /gm)||[]).length < 5) issues.push('Missing instructional sections ('+lang+')')
    if (spec.next_key && !body.includes((lang === 'en' ? spec.next_title_en! : spec.next_title_ar!))) issues.push('Missing actual next title ('+lang+')')
    if (spec.previous_key && !body.includes((lang === 'en' ? spec.previous_title_en! : spec.previous_title_ar!))) issues.push('Missing actual previous title ('+lang+')')
  }
  if (!/[\u0600-\u06ff]/.test(l.content_ar) || /[\u0600-\u06ff]/.test(l.content_en)) issues.push('Locale mismatch')
  if (new Set(l.activities.map(a=>a.slug)).size!==l.activities.length ||
      new Set(l.activities.map(a=>a.sort_order)).size!==l.activities.length) issues.push('Duplicate activity ordering/slug')
  return [...new Set(issues)]
}



