'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Locale } from '@/i18n/config'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type FormState = 'idle' | 'success' | 'error'

function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: ForgotPasswordFormValues): Promise<void> {
    setErrorMessage(null)

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/update-password`,
    })

    if (error) {
      setFormState('error')
      setErrorMessage(
        'Unable to send the reset email. Please check the address and try again.',
      )
      return
    }

    setFormState('success')
  }

  if (formState === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7c3aed]/15">
          <CheckCircle2 className="h-7 w-7 text-[#7c3aed]" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists for that email, we&apos;ve sent a password
            reset link. Check your spam folder if it doesn&apos;t arrive within
            a few minutes.
          </p>
        </div>
        <Link
          href={`/${locale}/login`}
          className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="auth-form space-y-5"
      >
        {formState === 'error' && errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive animate-fade-in"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="pl-10"
                    aria-required="true"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="gradient"
          size="xl"
          className="w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Sending link…</span>
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default function ForgotPasswordPage({
  params: { locale },
}: {
  params: { locale: Locale }
}) {
  return (
    <main className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-64 -top-64 h-[500px] w-[500px] rounded-full bg-[#f97316]/25 blur-[100px] animate-glow-pulse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -right-64 h-[500px] w-[500px] rounded-full bg-[#fbbf24]/20 blur-[100px] animate-glow-pulse [animation-delay:2.5s]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(124,58,237,0.06)_1px,transparent_1px)] bg-[size:28px_28px]"
      />

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
        <div className="auth-card rounded-2xl backdrop-blur-2xl px-8 py-10 sm:px-10">

          {/* Back link */}
          <Link
            href={`/${locale}/login`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 mb-7"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to sign in
          </Link>

          <div className="mb-7">
            <h1 className="auth-heading font-heading text-2xl font-extrabold tracking-tight">
              Forgot password?
            </h1>
            <p className="auth-subtitle mt-2 text-sm">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <ForgotPasswordForm locale={locale} />
        </div>
      </div>
    </main>
  )
}
