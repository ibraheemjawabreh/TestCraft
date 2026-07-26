'use client'

import { useState, useRef } from 'react'
import { Eye, EyeOff, Loader2, RotateCcw, Mail, CheckCircle2 } from 'lucide-react'
import type { Locale } from '@/i18n/config'

// ─── Props ──────────────────────────────────────────────────────────────────

interface LoginFormConfig {
  validEmail: string
  validPassword: string
}

interface LoginFormPracticalAppProps {
  config: LoginFormConfig
  activeBugs: string[]
  locale: Locale
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_PASSWORD_LENGTH = 6
const SUBMIT_DELAY_MS = 900

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Translations ────────────────────────────────────────────────────────────

function t(locale: Locale, key: string): string {
  const dict: Record<string, Record<string, string>> = {
    en: {
      login: 'Login',
      welcomeBack: 'Welcome back',
      signInAccount: 'Sign in to your account',
      email: 'Email',
      emailPlaceholder: 'qa.tester@testcraft.dev',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      forgotPassword: 'Forgot password?',
      loggingIn: 'Logging in...',
      loginSuccess: 'Login successful.',
      emailRequired: 'Email is required.',
      passwordRequired: 'Password is required.',
      invalidEmailFormat: 'Please enter a valid email address.',
      invalidCredentials: 'Invalid email or password.',
      shortPassword: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      recoveryTitle: 'Password Recovery',
      recoveryMsg: 'If this email is registered, a recovery link has been sent.',
      recoveryBack: 'Back to Login',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      reset: 'Reset Application',
    },
    ar: {
      login: 'تسجيل الدخول',
      welcomeBack: 'مرحباً بعودتك',
      signInAccount: 'سجّل دخولك إلى حسابك',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'qa.tester@testcraft.dev',
      password: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      forgotPassword: 'نسيت كلمة المرور؟',
      loggingIn: 'جارٍ تسجيل الدخول...',
      loginSuccess: 'تم تسجيل الدخول بنجاح.',
      emailRequired: 'البريد الإلكتروني مطلوب.',
      passwordRequired: 'كلمة المرور مطلوبة.',
      invalidEmailFormat: 'يرجى إدخال بريد إلكتروني صحيح.',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      shortPassword: `يجب أن تكون كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
      recoveryTitle: 'استعادة كلمة المرور',
      recoveryMsg: 'إذا كان هذا البريد مسجلاً، تم إرسال رابط الاستعادة.',
      recoveryBack: 'العودة لتسجيل الدخول',
      showPassword: 'إظهار كلمة المرور',
      hidePassword: 'إخفاء كلمة المرور',
      reset: 'إعادة تعيين التطبيق',
    },
  }
  return dict[locale]?.[key] ?? dict['en'][key] ?? key
}

// ─── Component ───────────────────────────────────────────────────────────────

type AppView = 'login' | 'recovery' | 'success'

export function LoginFormPracticalApp({ config, activeBugs, locale }: LoginFormPracticalAppProps) {
  // ── Bug flags ──────────────────────────────────────────────────────────────
  const bugEmailValidationMissing = activeBugs.includes('invalid_email_validation_missing')
  const bugForgotPasswordNoAction = activeBugs.includes('forgot_password_no_action')
  const bugRepeatedSubmissionAllowed = activeBugs.includes('repeated_submission_allowed')
  const bugShortPasswordMissing = activeBugs.includes('short_password_validation_missing')

  // ── State ──────────────────────────────────────────────────────────────────
  const [view, setView] = useState<AppView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const submittingRef = useRef(false)

  // ── Reset ──────────────────────────────────────────────────────────────────
  function handleReset() {
    setView('login')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setIsLoading(false)
    setEmailError('')
    setPasswordError('')
    setFormError('')
    setRecoveryEmail('')
    submittingRef.current = false
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  function handleForgotPassword(e: React.MouseEvent) {
    e.preventDefault()
    if (bugForgotPasswordNoAction) {
      // Bug: no visible action
      return
    }
    setRecoveryEmail(email)
    setView('recovery')
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e?: React.SyntheticEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Bug: repeated_submission_allowed — don't block if already submitting
    if (!bugRepeatedSubmissionAllowed && submittingRef.current) return
    if (!bugRepeatedSubmissionAllowed && isLoading) return

    setEmailError('')
    setPasswordError('')
    setFormError('')

    // ── Field-level validation ───────────────────────────────────────────────

    const trimmedEmail = email.trim()
    const trimmedPassword = password

    let hasError = false

    // Step 1: Required field checks (always enforced, even when bugs are active)
    if (!trimmedEmail) {
      setEmailError(t(locale, 'emailRequired'))
      hasError = true
    }

    if (!trimmedPassword) {
      setPasswordError(t(locale, 'passwordRequired'))
      hasError = true
    }

    if (hasError) return

    // Step 2: Format validation — SKIPPED when invalid_email_validation_missing is active
    if (!bugEmailValidationMissing && !EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError(t(locale, 'invalidEmailFormat'))
      hasError = true
    }

    // Step 3: Password length validation — SKIPPED when short_password_validation_missing is active
    if (!bugShortPasswordMissing && trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t(locale, 'shortPassword'))
      hasError = true
    }

    if (hasError) return

    // ── Simulate network request ─────────────────────────────────────────────
    setIsLoading(true)
    submittingRef.current = true

    setTimeout(() => {
      setIsLoading(false)
      submittingRef.current = false

      // Credential check (simulation only)
      const validEmail = config?.validEmail || 'qa.tester@testcraft.dev'
      const validPassword = config?.validPassword || 'Test@12345'

      if (
        trimmedEmail.toLowerCase() === validEmail.toLowerCase() &&
        trimmedPassword === validPassword
      ) {
        setView('success')
      } else {
        setFormError(t(locale, 'invalidCredentials'))
      }
    }, SUBMIT_DELAY_MS)
  }

  const isRtl = locale === 'ar'

  // ── Success View ───────────────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-sm mx-auto">
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="flex justify-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground">
            {t(locale, 'loginSuccess')}
          </h3>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t(locale, 'reset')}
          </button>
        </div>
      </div>
    )
  }

  // ── Recovery View ──────────────────────────────────────────────────────────
  if (view === 'recovery') {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-sm mx-auto">
        <div className="rounded-2xl border border-border/50 bg-card p-8 space-y-4 shadow-sm">
          <div className="flex justify-center">
            <Mail className="h-12 w-12 text-primary/70" />
          </div>
          <h3 className="font-heading text-xl font-bold text-center">{t(locale, 'recoveryTitle')}</h3>
          {recoveryEmail && (
            <p className="text-sm text-center text-muted-foreground break-all">
              <span className="font-mono text-foreground">{recoveryEmail}</span>
            </p>
          )}
          <p className="text-sm text-center text-muted-foreground">
            {t(locale, 'recoveryMsg')}
          </p>
          <button
            type="button"
            onClick={() => setView('login')}
            className="w-full h-10 rounded-lg border border-border/50 bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {t(locale, 'recoveryBack')}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              {t(locale, 'reset')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Login View ─────────────────────────────────────────────────────────────
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-sm mx-auto">
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <h3 className="font-heading text-2xl font-bold text-foreground">
            {t(locale, 'welcomeBack')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(locale, 'signInAccount')}
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Global error */}
          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {formError}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="lf-email" className="block text-sm font-medium text-foreground">
              {t(locale, 'email')}
              <span className="text-destructive ms-1" aria-hidden="true">*</span>
            </label>
            <input
              id="lf-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError('')
                if (formError) setFormError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSubmit(e)
                }
              }}
              className={`block w-full h-10 rounded-lg border px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                emailError ? 'border-destructive focus:ring-destructive/40' : 'border-input'
              }`}
              placeholder={t(locale, 'emailPlaceholder')}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'lf-email-error' : undefined}
            />
            {emailError && (
              <p id="lf-email-error" role="alert" className="text-xs text-destructive">
                {emailError}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="lf-password" className="block text-sm font-medium text-foreground">
                {t(locale, 'password')}
                <span className="text-destructive ms-1" aria-hidden="true">*</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-primary hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
              >
                {t(locale, 'forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <input
                id="lf-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                  if (formError) setFormError('')
                }}
                onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSubmit(e)
                }
              }}
              className={`block w-full h-10 rounded-lg border px-3 pe-10 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                  passwordError ? 'border-destructive focus:ring-destructive/40' : 'border-input'
                }`}
                placeholder={t(locale, 'passwordPlaceholder')}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'lf-password-error' : undefined}
              />
              <button
                type="button"
                aria-label={showPassword ? t(locale, 'hidePassword') : t(locale, 'showPassword')}
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none ${isRtl ? 'left-3' : 'right-3'}`}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                  : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {passwordError && (
              <p id="lf-password-error" role="alert" className="text-xs text-destructive">
                {passwordError}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            // Bug: repeated_submission_allowed — don't disable during loading
            disabled={!bugRepeatedSubmissionAllowed && isLoading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>{t(locale, 'loggingIn')}</span>
              </>
            ) : (
              t(locale, 'login')
            )}
          </button>
        </div>

        {/* Reset footer */}
        <div className="px-6 pb-5 text-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {t(locale, 'reset')}
          </button>
        </div>
      </div>
    </div>
  )
}
