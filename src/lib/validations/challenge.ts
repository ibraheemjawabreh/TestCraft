import { z } from 'zod'

// ─── Challenge Schema ────────────────────────────────────────────────────────

export const challengeSchema = z.object({
  title: z
    .string()
    .min(3, 'titleMin')
    .max(120, 'titleMax'),
  description: z
    .string()
    .min(20, 'descriptionMin')
    .max(3000, 'descriptionMax'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    required_error: 'required',
  }),
  base_xp_reward: z
    .number({ required_error: 'required', invalid_type_error: 'required' })
    .int()
    .min(10, 'xpMin')
    .max(10000, 'xpMax'),
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
