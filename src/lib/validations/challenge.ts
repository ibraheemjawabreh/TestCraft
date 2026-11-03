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
  module_id: z.string().uuid('required').nullable().optional(),
  lab_template_id: z.string().uuid('required').nullable().optional(),
  challenge_type: z.enum(['bug_report', 'test_cases', 'api_testing', 'automation'], {
    error: 'required',
  }).default('bug_report'),
  lab_template: z.string().max(160, 'titleMax').optional().or(z.literal('')),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    error: 'required',
  }),
  base_xp_reward: z
    .number({ error: 'required', })
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
  description: z.string().max(1000, 'descriptionMax').optional().or(z.literal('')),
  bug_identifier: z.string().max(80, 'titleMax').optional().or(z.literal('')),
  actual_severity: z.enum(['Low', 'Medium', 'High', 'Critical'], {
    error: 'required',
  }),
  bonus_xp: z
    .number({ error: 'required', })
    .int()
    .min(0, 'bonusXpMin')
    .max(1000, 'bonusXpMax'),
  is_active: z.boolean().default(true),
})

export type HiddenBugFormValues = z.infer<typeof hiddenBugSchema>
