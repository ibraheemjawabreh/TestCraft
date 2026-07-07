import { z } from 'zod'

/**
 * Zod schema for updating profile.
 * All validation messages are i18n keys resolved on the client.
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'usernameMin')
    .max(32, 'usernameMax')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'usernameInvalid')
    .trim(),
})

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>

/**
 * Zod schema for updating password.
 * Requires min 8 chars, uppercase, lowercase, number, special char.
 */
export const updatePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'passwordTooShort')
      .regex(/[A-Z]/, 'passwordNoUpper')
      .regex(/[a-z]/, 'passwordNoLower')
      .regex(/[0-9]/, 'passwordNoNumber')
      .regex(/[^A-Za-z0-9]/, 'passwordNoSpecial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'passwordsDoNotMatch',
    path: ['confirmPassword'],
  })

export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>
