import { z } from 'zod'

export const learningPathSchema = z.object({
  title_en: z
    .string()
    .min(3, 'titleMin')
    .max(120, 'titleMax')
    .trim(),
  title_ar: z
    .string()
    .min(3, 'titleMin')
    .max(120, 'titleMax')
    .trim(),
  description_en: z
    .string()
    .min(3, 'descriptionMin')
    .max(2000, 'descriptionMax')
    .trim(),
  description_ar: z
    .string()
    .min(3, 'descriptionMin')
    .max(2000, 'descriptionMax')
    .trim(),
  slug: z
    .string()
    .min(3, 'slugMin')
    .max(140, 'slugMax')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slugInvalid')
    .trim(),
  is_active: z.boolean().default(false),
  // sort_order is auto-assigned server-side — optional here
  sort_order: z
    .number({ error: 'required' })
    .int()
    .min(0)
    .default(0)
    .optional(),
})

export type LearningPathFormValues = z.infer<typeof learningPathSchema>
