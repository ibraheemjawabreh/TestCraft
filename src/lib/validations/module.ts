import { z } from 'zod'

export const moduleSchema = z.object({
  learning_path_id: z.string().uuid('required'),
  title_en: z
    .string()
    .min(2, 'titleMin')
    .max(120, 'titleMax')
    .trim(),
  title_ar: z
    .string()
    .min(2, 'titleMin')
    .max(120, 'titleMax')
    .trim()
    .optional()
    .or(z.literal('')),
  slug: z
    .string()
    .min(2, 'slugMin')
    .max(140, 'slugMax')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slugInvalid')
    .trim(),
  description_en: z
    .string()
    .max(300, 'summaryMax')
    .optional()
    .or(z.literal('')),
  description_ar: z
    .string()
    .max(300, 'summaryMax')
    .optional()
    .or(z.literal('')),
  sort_order: z
    .number({ invalid_type_error: 'required' })
    .int()
    .min(0, 'sortOrderMin')
    .default(0),
  is_published: z.boolean().default(false),
})

export type ModuleFormValues = z.infer<typeof moduleSchema>
