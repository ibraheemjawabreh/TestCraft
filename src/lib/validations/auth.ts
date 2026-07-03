import { z } from 'zod'

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),

  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.'),

  rememberMe: z.boolean().default(false),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ─── Forgot Password ─────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Registration form schema.
 *
 * Transformations applied before validation:
 *  - fullName: trimmed
 *  - email:    trimmed + lowercased
 *
 * These transformed values are what the `onSubmit` handler receives,
 * ensuring data sent to Supabase is always normalized.
 */
export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(2, 'Username must be at least 2 characters.')
      .max(40, 'Username must be 40 characters or less.')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email is required.')
      .email('Please enter a valid email address.'),

    password: z
      .string()
      .min(1, 'Password is required.')
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
      .regex(/[0-9]/, 'Password must include at least one number.')
      .regex(
        /[^A-Za-z0-9]/,
        'Password must include at least one special character (e.g. @, #, $, !).',
      ),

    confirmPassword: z.string().min(1, 'Please confirm your password.'),

    acceptTerms: z
      .boolean()
      .refine(
        (v) => v === true,
        'You must accept the Terms and Privacy Policy to continue.',
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
