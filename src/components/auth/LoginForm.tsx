'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
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
import { GoogleSignInButton } from './GoogleSignInButton'

// ─── Error Message Mapping ────────────────────────────────────────────────────

/**
 * Maps Supabase Auth error messages to user-friendly copies.
 * Avoids leaking internal error details to the UI.
 */
const AUTH_ERROR_MAP: Readonly<Record<string, string>> = {
  'Invalid login credentials':
    'Invalid email or password. Please double-check and try again.',
  'Email not confirmed':
    'Your email address has not been verified. Please check your inbox.',
  'Too many requests':
    'Too many sign-in attempts. Please wait a few minutes and try again.',
  'User not found':
    'No account found with this email address.',
  'Invalid email or password':
    'Invalid email or password. Please double-check and try again.',
} as const

function mapAuthError(message: string): string {
  return (
    AUTH_ERROR_MAP[message] ??
    'Something went wrong. Please try again or contact support.'
  )
}

// ─── LoginForm ────────────────────────────────────────────────────────────────

/**
 * Complete login form with:
 * - Email + password fields (React Hook Form + Zod validation)
 * - Password visibility toggle
 * - "Remember me" checkbox (controls session storage strategy)
 * - Loading state (disables all inputs + button during request)
 * - Error banner for Supabase auth errors
 * - Google OAuth via GoogleSignInButton
 * - Link to register and forgot-password pages
 */
export function LoginForm({ dictionary, locale }: { dictionary: any; locale: string }) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
    mode: 'onBlur', // Validate fields when they lose focus (less aggressive UX)
  })

  const { isSubmitting } = form.formState

  // Stable toggle to prevent unnecessary re-renders
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  async function onSubmit(values: LoginFormValues): Promise<void> {
    // Clear any previous auth error
    setAuthError(null)

    // Create client with the appropriate session persistence strategy
    const supabase = createClient(values.rememberMe)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setAuthError(mapAuthError(error.message))
      return
    }

    // Refresh server components to pick up the new session cookie, then
    // let the server choose the role-aware landing page.
    router.refresh()
    router.push(`/auth/post-login?locale=${locale}`)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate // Let Zod handle validation, not the browser
        className="auth-form space-y-5"
        aria-label="Sign in form"
      >
        {/* ── Auth error banner ──────────────────────────────────────────── */}
        {authError !== null && (
          <div
            role="alert"
            aria-live="assertive"
            className={[
              'flex items-start gap-3 rounded-lg p-3.5 text-sm',
              'border border-destructive/30 bg-destructive/10 text-destructive',
              'animate-fade-in',
            ].join(' ')}
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{authError}</span>
          </div>
        )}

        {/* ── Email ─────────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.auth.email}</FormLabel>
              <FormControl>
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
                  disabled={isSubmitting}
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Password ──────────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              {/* Label row with inline "Forgot password" link */}
              <div className="flex items-center justify-between">
                <FormLabel>{dictionary.auth.password}</FormLabel>
                <Link
                  href={`/${locale}/forgot-password`}
                  className={[
                    'text-xs text-muted-foreground',
                    'hover:text-primary transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
                  ].join(' ')}
                  tabIndex={0}
                >
                  {dictionary.auth.forgotPassword}
                </Link>
              </div>

              <FormControl>
                {/* Wrapper needed so the toggle sits inside the input border */}
                <div className="relative">
                  <Input
                    {...field}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="pr-11"
                    aria-required="true"
                  />

                  {/* Show / hide toggle */}
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isSubmitting}
                    className={[
                      'absolute right-3 top-1/2 -translate-y-1/2',
                      'text-muted-foreground hover:text-foreground',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
                      'disabled:pointer-events-none',
                    ].join(' ')}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Remember me ───────────────────────────────────────────────── */}
        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2.5 space-y-0">
              <FormControl>
                <Checkbox
                  id="rememberMe"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                  aria-describedby="rememberMe-description"
                />
              </FormControl>
              <div className="leading-none">
                <Label
                  htmlFor="rememberMe"
                  className="cursor-pointer text-sm font-normal text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  {dictionary.auth.rememberMe}
                </Label>
                <span id="rememberMe-description" className="sr-only">
                  When unchecked, your session will end when you close the browser tab.
                </span>
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
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{dictionary.common.loading}</span>
            </>
          ) : (
            <span>{dictionary.auth.login}</span>
          )}
        </Button>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <AuthDivider />

        {/* ── Google OAuth ──────────────────────────────────────────────── */}
        <GoogleSignInButton
          disabled={isSubmitting}
          text={dictionary.auth.continueWithGoogle}
          locale={locale}
        />

        {/* ── Register link ─────────────────────────────────────────────── */}
        <p className="text-center text-sm text-muted-foreground pt-1">
          {dictionary.auth.dontHaveAccount}{' '}
          <Link
            href={`/${locale}/register`}
            className={[
              'font-semibold text-foreground',
              'underline underline-offset-4 decoration-border',
              'hover:text-primary hover:decoration-primary',
              'transition-colors duration-150',
            ].join(' ')}
          >
            {dictionary.auth.register}
          </Link>
        </p>
      </form>
    </Form>
  )
}
