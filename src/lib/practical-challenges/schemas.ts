import { z } from 'zod'

export const loginFormConfigSchema = z.object({
  requireEmailVerification: z.boolean().default(false),
  allowSocialLogin: z.boolean().default(true),
  passwordMinLength: z.number().int().min(6).max(32).default(8),
})

export type LoginFormConfig = z.infer<typeof loginFormConfigSchema>

// A union of all possible app configs for validation when saving
export const practicalAppConfigSchema = z.union([
  loginFormConfigSchema,
  z.record(z.unknown()), // Fallback for apps with no specific config schema yet
])
