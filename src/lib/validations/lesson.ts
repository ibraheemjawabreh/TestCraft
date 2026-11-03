import { z } from 'zod'

export const lessonSchema = z.object({
  learning_path_id: z.string().uuid('required'),
  module_id: z.string().uuid('required').nullable().optional(),
  title_en: z
    .string()
    .max(120, 'titleMax')
    .trim()
    .default(''),
  title_ar: z
    .string()
    .max(120, 'titleMax')
    .trim()
    .default(''),
  slug: z
    .string()
    .max(140, 'slugMax')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slugInvalid')
    .trim()
    .or(z.literal(''))
    .default(''),
  summary_en: z
    .string()
    .max(300, 'summaryMax')
    .optional()
    .or(z.literal('')),
  summary_ar: z
    .string()
    .max(300, 'summaryMax')
    .optional()
    .or(z.literal('')),
  content_en: z
    .string()
    .default(''),
  content_ar: z
    .string()
    .default(''),
  objectives_en: z
    .array(z.string().max(160, 'objectiveMax'))
    .default([]),
  objectives_ar: z
    .array(z.string().max(160, 'objectiveMax'))
    .default([]),
  estimated_minutes: z
    .number({ error: 'required' })
    .int()
    .min(1, 'estMinutesMin')
    .max(240, 'estMinutesMax')
    .default(10),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    error: 'required',
  }).default('Beginner'),
  sort_order: z
    .number({ error: 'required' })
    .int()
    .min(0, 'sortOrderMin')
    .default(0),
  is_published: z.boolean().default(false),
})

export type LessonFormValues = z.infer<typeof lessonSchema>
