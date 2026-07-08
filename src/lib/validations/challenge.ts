import { z } from 'zod'

// ─── Challenge Schema ────────────────────────────────────────────────────────

export const challengeSchema = z.object({
  title_en: z
    .string()
    .min(3, 'titleMin')
    .max(120, 'titleMax'),
  title_ar: z
    .string()
    .min(3, 'titleMin')
    .max(120, 'titleMax'),
  description_en: z
    .string()
    .min(20, 'descriptionMin')
    .max(3000, 'descriptionMax'),
  description_ar: z
    .string()
    .min(20, 'descriptionMin')
    .max(3000, 'descriptionMax'),
  scenario_en: z.string().max(5000, 'descriptionMax').optional().or(z.literal('')),
  scenario_ar: z.string().max(5000, 'descriptionMax').optional().or(z.literal('')),
  instructions_en: z.string().max(5000, 'descriptionMax').optional().or(z.literal('')),
  instructions_ar: z.string().max(5000, 'descriptionMax').optional().or(z.literal('')),
  lesson_id: z.string().uuid('required').nullable().optional(),
  challenge_type: z.string().min(2, 'required').max(80, 'titleMax').default('bug_hunt'),
  lab_template: z.string().max(160, 'titleMax').optional().or(z.literal('')),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    required_error: 'required',
  }),
  base_xp_reward: z
    .number({ required_error: 'required', invalid_type_error: 'required' })
    .int()
    .min(10, 'xpMin')
    .max(10000, 'xpMax'),
  is_required: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

export type ChallengeFormValues = z.infer<typeof challengeSchema>

// ─── Hidden Bug Schema ──────────────────────────────────────────────────────

export const hiddenBugSchema = z.object({
  bug_title: z
    .string()
    .min(3, 'bugTitleMin')
    .max(160, 'bugTitleMax'),
  actual_severity: z.enum(['Low', 'Medium', 'High', 'Critical'], {
    required_error: 'required',
  }),
  bonus_xp: z
    .number({ required_error: 'required', invalid_type_error: 'required' })
    .int()
    .min(0, 'bonusXpMin')
    .max(1000, 'bonusXpMax'),
})

export type HiddenBugFormValues = z.infer<typeof hiddenBugSchema>
