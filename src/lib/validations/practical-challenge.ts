import { z } from 'zod'

export const practicalChallengeSchema = z.object({
  title_en: z.string().min(3).max(120),
  title_ar: z.string().min(3).max(120),
  slug: z.string().min(3).max(100),
  description_en: z.string().min(20).max(3000),
  description_ar: z.string().min(20).max(3000),
  scenario_en: z.string().max(5000).optional().or(z.literal('')),
  scenario_ar: z.string().max(5000).optional().or(z.literal('')),
  instructions_en: z.string().max(5000).optional().or(z.literal('')),
  instructions_ar: z.string().max(5000).optional().or(z.literal('')),
  
  learning_path_id: z.string().uuid().nullable().optional(),
  lesson_id: z.string().uuid().nullable().optional(),
  module_id: z.string().uuid().nullable().optional(),
  
  challenge_type: z.enum(['bug_report', 'test_cases', 'api_testing', 'automation']).default('bug_report'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  base_xp_reward: z.number().int().min(10).max(10000),
  sort_order: z.number().int().min(1).default(1),
  is_required: z.boolean().default(true),
  is_active: z.boolean().default(true),

  // Practical Application system
  practical_app_key: z.string().nullable().optional(),
  practical_app_config: z.record(z.unknown()).default({}),

  // Embedded bugs for this challenge (sent as JSON payload)
  embedded_bugs: z.array(
    z.object({
      bug_key: z.string(),
      bug_title: z.string().min(3).max(160),
      description: z.string().max(1000).optional().or(z.literal('')),
      actual_severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
      bonus_xp: z.number().int().min(0).max(1000),
      is_active: z.boolean().default(true),
    })
  ).default([]),
})

export type PracticalChallengeFormValues = z.infer<typeof practicalChallengeSchema>
