import { resolveLocale } from '@/lib/locale'
import type { Metadata } from 'next'

import { Logo } from '@/components/brand/Logo'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'
import { safeLearningRedirect } from '@/lib/auth/learning-redirect'

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Create your free TestCraft account and start your QA engineering journey with real-world testing challenges.',
}

export default async function RegisterPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ redirectTo?: string | string[] }>
}) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)
  const destination = safeLearningRedirect((await searchParams).redirectTo, locale)

  const dictionary = await getDictionary(locale)

  return (
    <main
      className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 transition-colors"
    >
      {/* ── Top-right Controls ────────────────────────────────────────── */}
      <div className="auth-controls absolute top-5 end-5 z-50 flex items-center gap-3 rounded-full px-3 py-2 shadow-lg backdrop-blur-xl animate-fade-in-up">
        <ThemeToggle dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} locale={locale} destination={destination} />
      </div>

      {/* ── Atmospheric background ──────────────────────────────────────── */}

      {/* Top-right Sunset orange/gold orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#f97316]/30 blur-[120px] animate-glow-pulse"
      />

      {/* Bottom-left gold orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -left-64 h-[600px] w-[600px] rounded-full bg-[#fbbf24]/20 blur-[120px] animate-glow-pulse [animation-delay:2.5s]"
      />

      {/* Center ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f97316]/6 blur-[80px]"
      />

      {/* Dot-grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(249,115,22,0.04)_1px,transparent_1px)] bg-[size:28px_28px]"
      />

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[480px] animate-fade-in-up">

        {/* Outer glow ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-70 blur-[1px]"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f97316)',
          }}
        />

        {/* Glass card */}
        <div
          className={[
            'relative rounded-2xl',
            'auth-card backdrop-blur-2xl',
            'px-8 py-10',
            'sm:px-10',
          ].join(' ')}
        >
          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Logo locale={locale} textClassName="text-white" />

          {/* ── Heading ──────────────────────────────────────────────── */}
          <div className="mt-7 mb-6">
            <h1 className="auth-heading font-heading text-[2.05rem] font-bold leading-[1.1] tracking-[-0.03em]">
              {dictionary.auth.createAccount}
            </h1>
            <p className="auth-subtitle mt-3 text-[0.9375rem] leading-relaxed">
              {dictionary.auth.continueYourJourney}
            </p>
          </div>

          {/* ── Form (Client Component) ───────────────────────────────── */}
          <RegisterForm dictionary={dictionary} locale={locale} destination={destination} />
        </div>

        {/* Bottom gradient line */}
        <div
          aria-hidden="true"
          className="absolute -bottom-px left-[15%] right-[15%] h-px opacity-40 blur-[1px]"
          style={{
            background: 'linear-gradient(90deg, #fbbf24, #f97316)',
          }}
        />
      </div>

    </main>
  )
}
