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

function getSafeSignupMessage(message: string, dictionary: any): string {
  const AUTH_ERROR_MAP: Record<string, string> = {
    'User already registered': dictionary.auth.emailAlreadyRegistered,
    'Email already exists': dictionary.auth.emailAlreadyRegistered,
    'Password should be at least 6 characters': dictionary.validation.passwordTooShort,
    'Signup is disabled': 'New registrations are temporarily unavailable. Please try again later.',
    'Email rate limit exceeded': 'Too many attempts. Please wait a moment and try again.',
    'over_email_send_rate_limit': 'Too many emails sent. Please wait a moment and try again.',
  }
  return AUTH_ERROR_MAP[message] ?? 'Something went wrong. Please try again or contact support.'
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
  dictionary: any
  locale: string
}

function SuccessCard({ dictionary, locale }: SuccessCardProps) {
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
        <h2 className="font-heading text-xl font-bold text-foreground">
          {dictionary.auth.checkEmail}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {dictionary.auth.safeEmailConfirmation}
        </p>
      </div>

      <div className="flex flex-col w-full gap-3 mt-4">
        <Link
          href={`/${locale}/login`}
          className="flex h-11 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm w-full"
        >
          {dictionary.auth.goToSignIn}
        </Link>
        <Link
          href={`/${locale}/forgot-password`}
          className="flex h-11 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 text-foreground hover:bg-secondary/60 hover:border-primary/40 transition-all font-medium text-sm w-full"
        >
          {dictionary.auth.forgotPassword}
        </Link>
      </div>
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
export function RegisterForm({ dictionary, locale }: { dictionary: any; locale: string }) {
  const router = useRouter()
  const [status, setStatus]           = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
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
        username: values.username,
        registration_provider: 'email',
      }

      const normalizedEmail = values.email.trim().toLowerCase()

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: values.password,
        options: {
          data: metadata,
          // Email confirmation link redirects here
          emailRedirectTo: `${window.location.origin}/auth/callback?locale=${locale}`,
        },
      })

      if (error) {
        setStatus('error')
        setErrorMessage(getSafeSignupMessage(error.message, dictionary))
        return
      }

      // Case 1: Email confirmation required (session is null)
      if (data.user && !data.session) {
        setStatus('email-sent')
        return
      }

      // Case 2: Email confirmation disabled — user is immediately signed in
      if (data.session) {
        router.push(`/auth/post-login?locale=${locale}`)
        router.refresh()
        return
      }

      // Fallback: treat as email-sent (edge case)
      setStatus('email-sent')
    },
    [router],
  )



  const isDisabled = isSubmitting || status === 'submitting'

  // ─── Success state ──────────────────────────────────────────────────────────
  if (status === 'email-sent') {
    return (
      <SuccessCard
        dictionary={dictionary}
        locale={locale}
      />
    )
  }

  // ─── Form ───────────────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="auth-form space-y-4"
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

        {/* ── Username ─────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{dictionary.auth.username}</FormLabel>
              <FormControl>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
                    aria-hidden="true"
                  />
                  <Input
                    {...field}
                    id="username"
                    type="text"
                    placeholder="janesmith123"
                    autoComplete="username"
                    autoCapitalize="none"
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
              <FormLabel>{dictionary.auth.email}</FormLabel>
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
              <FormLabel>{dictionary.auth.password}</FormLabel>
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
              <FormLabel>{dictionary.auth.confirmPassword}</FormLabel>
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
              <span>{dictionary.common.loading}</span>
            </>
          ) : (
            <span>{dictionary.auth.register}</span>
          )}
        </Button>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <AuthDivider />

        {/* ── Google OAuth ──────────────────────────────────────────────── */}
        <OAuthButton
          provider="google"
          label={dictionary.auth.continueWithGoogle}
          disabled={isDisabled}
          redirectPath={`/auth/callback?locale=${locale}`}
        />

        {/* ── Sign in link ──────────────────────────────────────────────── */}
        <p className="text-center text-sm text-muted-foreground pt-1">
          {dictionary.auth.alreadyHaveAccount}{' '}
          <Link
            href={`/${locale}/login`}
            className={[
              'font-semibold text-foreground',
              'underline underline-offset-4 decoration-border',
              'hover:text-primary hover:decoration-primary',
              'transition-colors duration-150',
            ].join(' ')}
          >
            {dictionary.auth.login}
          </Link>
        </p>
      </form>
    </Form>
  )
}
