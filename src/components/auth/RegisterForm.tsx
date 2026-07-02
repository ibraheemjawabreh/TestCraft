'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Loader2, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import type { RegistrationMetadata } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { AuthDivider } from './AuthDivider'
import { OAuthButton } from './OAuthButton'
import { PasswordInput } from './PasswordInput'

// ─── Error message mapping ────────────────────────────────────────────────────

/**
 * Maps Supabase Auth error messages to user-friendly copies.
 * Never expose raw Supabase or database error strings to the user.
 */
const AUTH_ERROR_MAP: Readonly<Record<string, string>> = {
  'User already registered':
    'This email is already registered. Try signing in instead.',
  'Email already exists':
    'This email is already registered. Try signing in instead.',
  'Password should be at least 6 characters':
    'Please choose a stronger password.',
  'Signup is disabled':
    'New registrations are temporarily unavailable. Please try again later.',
  'Email rate limit exceeded':
    'Too many attempts. Please wait a moment and try again.',
  'over_email_send_rate_limit':
    'Too many emails sent. Please wait a moment and try again.',
} as const

function mapRegisterError(message: string): string {
  return (
    AUTH_ERROR_MAP[message] ??
    'Something went wrong. Please try again or contact support.'
  )
}

// ─── Password Strength Indicator ─────────────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4

function calculatePasswordStrength(password: string): StrengthLevel {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score as StrengthLevel
}

const STRENGTH_CONFIG: Record<
  Exclude<StrengthLevel, 0>,
  { label: string; color: string; bars: number }
> = {
  1: { label: 'Weak',   color: 'bg-red-500',    bars: 1 },
  2: { label: 'Fair',   color: 'bg-orange-400',  bars: 2 },
  3: { label: 'Good',   color: 'bg-yellow-400',  bars: 3 },
  4: { label: 'Strong', color: 'bg-emerald-500', bars: 4 },
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = calculatePasswordStrength(password)
  if (!password || strength === 0) return null

  const config = STRENGTH_CONFIG[strength]

  return (
    <div className="space-y-1.5" aria-live="polite" aria-label={`Password strength: ${config.label}`}>
      <div className="flex gap-1" role="presentation">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={[
              'h-1 flex-1 rounded-full transition-all duration-300',
              bar <= config.bars ? config.color : 'bg-secondary',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="text-[0.75rem] text-muted-foreground">
        Strength:{' '}
        <span
          className={
            strength === 4 ? 'text-emerald-400' : 'text-muted-foreground'
          }
        >
          {config.label}
        </span>
      </p>
    </div>
  )
}

// ─── Form States ─────────────────────────────────────────────────────────────

type FormStatus = 'idle' | 'submitting' | 'email-sent' | 'error'

// ─── Success Card ─────────────────────────────────────────────────────────────

interface SuccessCardProps {
  email: string
  onResend: () => Promise<void>
  isResending: boolean
}

function SuccessCard({ email, onResend, isResending }: SuccessCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-5 py-4 text-center animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-gradient shadow-glow-primary">
        <Mail className="h-7 w-7 text-white" aria-hidden="true" />
      </div>

      <div className="space-y-2.5">
        <h2 className="font-heading text-xl font-bold text-white">
          Check your inbox
        </h2>
        <p className="text-sm text-[#6b7a99] leading-relaxed">
          We sent a confirmation link to{' '}
          <strong className="text-foreground font-medium">{email}</strong>.
          Click it to activate your account.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={isResending}
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors disabled:pointer-events-none disabled:opacity-60"
          >
            {isResending ? 'Sending…' : 'resend the email'}
          </button>
          .
        </p>
      </div>

      <Link
        href="/login"
        className="mt-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  )
}

// ─── RegisterForm ─────────────────────────────────────────────────────────────

/**
 * Complete registration form.
 *
 * Responsibilities (single component, clear sections):
 *  - Render all form fields with labels and error messages
 *  - Validate via Zod (React Hook Form resolver)
 *  - Submit email+password registration to Supabase
 *  - Handle email-confirmation and immediate-session flows
 *  - Display loading / error / success states
 *  - Prevent duplicate submissions
 *
 * Google sign-up is delegated to OAuthButton (separate component).
 */
export function RegisterForm() {
  const router = useRouter()
  const [status, setStatus]           = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isResending, setIsResending]   = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onBlur', // Validate on blur — less aggressive than onChange
  })

  const { isSubmitting, errors } = form.formState
  const watchedPassword = form.watch('password')

  // Stable submission guard — isSubmitting from RHF handles the rest
  const onSubmit = useCallback(
    async (values: RegisterFormValues): Promise<void> => {
      setStatus('submitting')
      setErrorMessage(null)

      const supabase = createClient()

      const metadata: RegistrationMetadata = {
        full_name: values.fullName,
        registration_provider: 'email',
      }

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: metadata,
          // Email confirmation link redirects here
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setStatus('error')
        setErrorMessage(mapRegisterError(error.message))
        return
      }

      // Case 1: Email confirmation required (session is null)
      if (data.user && !data.session) {
        setStatus('email-sent')
        return
      }

      // Case 2: Email confirmation disabled — user is immediately signed in
      if (data.session) {
        router.push('/academy')
        router.refresh()
        return
      }

      // Fallback: treat as email-sent (edge case)
      setStatus('email-sent')
    },
    [router],
  )

  // Resend confirmation email
  const handleResend = useCallback(async (): Promise<void> => {
    setIsResending(true)
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email: form.getValues('email'),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setIsResending(false)
  }, [form])

  const isDisabled = isSubmitting || status === 'submitting'

  // ─── Success state ──────────────────────────────────────────────────────────
  if (status === 'email-sent') {
    return (
      <SuccessCard
        email={form.getValues('email')}
        onResend={handleResend}
        isResending={isResending}
      />
    )
  }

  // ─── Form ───────────────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-4"
        aria-label="Create account form"
      >
        {/* ── Auth error banner ──────────────────────────────────────────── */}
        {status === 'error' && errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className={[
              'flex items-start gap-3 rounded-lg p-3.5 text-sm',
              'border border-destructive/30 bg-destructive/10 text-destructive',
              'animate-fade-in',
            ].join(' ')}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Full Name ─────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                  <Input
                    {...field}
                    id="fullName"
                    type="text"
                    placeholder="Jane Smith"
                    autoComplete="name"
                    autoCapitalize="words"
                    spellCheck={false}
                    disabled={isDisabled}
                    className={[
                      'pl-10',
                      fieldState.error
                        ? 'border-destructive/60 focus-visible:ring-destructive/30'
                        : '',
                    ].join(' ')}
                    aria-required="true"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Email ─────────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    disabled={isDisabled}
                    className={[
                      'pl-10',
                      fieldState.error
                        ? 'border-destructive/60 focus-visible:ring-destructive/30'
                        : '',
                    ].join(' ')}
                    aria-required="true"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Password ──────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  id="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isDisabled}
                  hasError={!!fieldState.error}
                  aria-required="true"
                />
              </FormControl>
              {/* Password strength bar — shown while typing, before error */}
              {!fieldState.error && (
                <PasswordStrengthBar password={watchedPassword} />
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Confirm Password ──────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  id="confirmPassword"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isDisabled}
                  hasError={!!fieldState.error}
                  aria-required="true"
                />
              </FormControl>
              {/* Check icon when passwords match */}
              {!fieldState.error && field.value && field.value === watchedPassword && (
                <p className="flex items-center gap-1.5 text-[0.75rem] text-emerald-400 animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Passwords match
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Terms & Privacy ───────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field, fieldState }) => (
            <FormItem className="flex flex-row items-start gap-2.5 space-y-0 pt-1">
              <FormControl>
                <Checkbox
                  id="acceptTerms"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                  aria-describedby={fieldState.error ? 'acceptTerms-error' : undefined}
                  aria-invalid={!!fieldState.error}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor="acceptTerms"
                  className="cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                  .
                </Label>
                {/* Render error outside FormMessage so we can id it for aria */}
                {fieldState.error && (
                  <p
                    id="acceptTerms-error"
                    role="alert"
                    className="text-[0.8rem] font-medium text-destructive animate-fade-in"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            </FormItem>
          )}
        />

        {/* ── Submit button ─────────────────────────────────────────────── */}
        <Button
          type="submit"
          variant="gradient"
          size="xl"
          className="w-full mt-2"
          disabled={isDisabled}
          aria-busy={isDisabled}
        >
          {isDisabled ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Creating account…</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </Button>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <AuthDivider />

        {/* ── Google OAuth ──────────────────────────────────────────────── */}
        <OAuthButton
          provider="google"
          label="Continue with Google"
          disabled={isDisabled}
          redirectPath="/auth/callback"
        />

        {/* ── Sign in link ──────────────────────────────────────────────── */}
        <p className="text-center text-sm text-muted-foreground pt-1">
          Already have an account?{' '}
          <Link
            href="/login"
            className={[
              'font-semibold text-foreground',
              'underline underline-offset-4 decoration-border',
              'hover:text-primary hover:decoration-primary',
              'transition-colors duration-150',
            ].join(' ')}
          >
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
