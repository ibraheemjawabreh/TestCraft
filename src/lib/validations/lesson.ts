import { z } from 'zod'

export const lessonSchema = z.object({
  learning_path_id: z.string().uuid('required'),
  title: z
    .string()
    .min(3, 'titleMin')
    .max(120, 'titleMax')
    .trim(),
  slug: z
    .string()
    .min(3, 'slugMin')
    .max(140, 'slugMax')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slugInvalid')
    .trim(),
  summary: z
    .string()
    .max(300, 'summaryMax')
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .min(30, 'contentMin')
    .trim(),
  objectives: z
    .array(z.string().max(160, 'objectiveMax'))
    .default([]),
  estimated_minutes: z
    .number({ invalid_type_error: 'required' })
    .int()
    .min(1, 'estMinutesMin')
    .max(240, 'estMinutesMax')
    .default(10),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    required_error: 'required',
  }),
  sort_order: z
    .number({ invalid_type_error: 'required' })
    .int()
    .min(0, 'sortOrderMin')
    .default(0),
  is_published: z.boolean().default(false),
})

export type LessonFormValues = z.infer<typeof lessonSchema>
