import { z } from 'zod'

export const labTemplateSchema = z.object({
  name_en: z.string().min(1, 'Name is required').max(255),
  name_ar: z.string().max(255).optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-_]+$/, 'Slug must only contain lowercase letters, numbers, hyphens, or underscores'),
  lab_type: z.string().min(1, 'Type is required'),
  is_active: z.boolean().default(false),
})

export type LabTemplateFormValues = z.infer<typeof labTemplateSchema>
