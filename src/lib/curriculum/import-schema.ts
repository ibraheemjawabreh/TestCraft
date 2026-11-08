import { z } from 'zod'
import { activitySchema } from './content.schema'

const slug = z.string().max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const title = z.string().trim().min(2).max(120)
const description = z.string().max(2000).default('')
const metadata = {
  id: z.string().uuid().optional(),
  slug,
  title_en: title,
  title_ar: title,
  sort_order: z.number().int().nonnegative().max(1000000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
}
const lesson = z.object({
  ...metadata,
  summary_en: z.string().max(300).default(''),
  summary_ar: z.string().max(300).default(''),
  content_en: z.string().max(200000).refine(v => v.trim().length > 0, 'English Markdown is required'),
  content_ar: z.string().max(200000).refine(v => v.trim().length > 0, 'Arabic Markdown is required'),
  objectives_en: z.array(z.string().trim().min(1).max(160)).max(30),
  objectives_ar: z.array(z.string().trim().min(1).max(160)).max(30),
  estimated_minutes: z.number().int().min(1).max(240),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  // Practical examples belong in Markdown, avoiding a second content source.
  practice: z.array(activitySchema).max(30).default([]),
}).strict()
const moduleSchema = z.object({
  ...metadata, description_en: z.string().max(300).default(''), description_ar: z.string().max(300).default(''),
  lessons: z.array(lesson).max(2000),
}).strict()
export const curriculumImportSchema = z.object({
  format: z.literal('testcraft-curriculum-v1'),
  unassigned_lessons: z.array(z.unknown()).optional(),
  paths: z.array(z.object({
    ...metadata, description_en: description, description_ar: description,
    modules: z.array(moduleSchema).max(1000),
  }).strict()).min(1).max(100),
}).strict().superRefine((doc, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
  if (doc.unassigned_lessons?.length) issue(['unassigned_lessons'], 'This export contains legacy lessons without modules. Assign them to modules before re-importing. Their full data remains in the export and backup.')
  function siblings(items: { slug: string; sort_order?: number }[], path: (string | number)[]) {
    const slugs = new Set<string>()
    let previous = -1
    items.forEach((item, index) => {
      if (slugs.has(item.slug)) issue([...path, index, 'slug'], 'Duplicate slug')
      slugs.add(item.slug)
      const order = item.sort_order ?? index
      if (order <= previous) issue([...path, index, 'sort_order'], 'Sort orders must strictly increase in array order; omit all sort_order fields to use array order')
      previous = order
    })
  }
  siblings(doc.paths, ['paths'])
  let total = 0
  doc.paths.forEach((p, pi) => {
    siblings(p.modules, ['paths', pi, 'modules'])
    const lessonSlugs = new Set<string>()
    p.modules.forEach((m, mi) => {
      siblings(m.lessons, ['paths', pi, 'modules', mi, 'lessons'])
      m.lessons.forEach((l, li) => {
        total++
        const path = ['paths', pi, 'modules', mi, 'lessons', li]
        if (lessonSlugs.has(l.slug)) issue([...path, 'slug'], 'Lesson slugs must be unique within the entire path')
        lessonSlugs.add(l.slug)
        if (!/[\u0600-\u06ff]/.test(l.content_ar)) issue([...path, 'content_ar'], 'Arabic content is required')
        siblings(l.practice, [...path, 'practice'])
      })
    })
  })
  if (total > 10000) issue(['paths'], 'Maximum 10,000 lessons per file')
}).transform(doc => ({
  ...doc,
  paths: doc.paths.map((p, pi) => ({ ...p, sort_order: p.sort_order ?? pi,
    modules: p.modules.map((m, mi) => ({ ...m, sort_order: m.sort_order ?? mi,
      lessons: m.lessons.map((l, li) => ({ ...l, sort_order: l.sort_order ?? li })),
    })),
  })),
}))
export type CurriculumDocument = z.output<typeof curriculumImportSchema>
export function curriculumCounts(doc: CurriculumDocument) {
  return { paths: doc.paths.length, modules: doc.paths.reduce((n, p) => n + p.modules.length, 0),
    lessons: doc.paths.reduce((n, p) => n + p.modules.reduce((a, m) => a + m.lessons.length, 0), 0) }
}
