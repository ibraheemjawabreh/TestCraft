import type { Metadata } from 'next'

import { Logo } from '@/components/brand/Logo'
import { LoginForm } from '@/components/auth/LoginForm'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to TestCraft and continue your QA engineering journey.',
}

export default async function LoginPage({ params: { locale } }: { params: { locale: Locale } }) {
  const dictionary = await getDictionary(locale)

  return (
    <main
      className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 transition-colors"
    >
      {/* ── Top-right Controls ────────────────────────────────────────── */}
      <div className="auth-controls absolute top-5 end-5 z-50 flex items-center gap-3 rounded-full px-3 py-2 shadow-lg backdrop-blur-xl animate-fade-in-up">
        <ThemeToggle dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} locale={locale} />
      </div>

      {/* ── Atmospheric background ──────────────────────────────────────── */}

      {/* Top-left Sunset orange orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#f97316]/30 blur-[120px] animate-glow-pulse"
      />

      {/* Bottom-right Gold orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-[#fbbf24]/20 blur-[120px] animate-glow-pulse [animation-delay:2.5s]"
      />

      {/* Center ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f97316]/6 blur-[80px]"
      />

      {/* Dot-grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(249,115,22,0.04)_1px,transparent_1px)] bg-[size:28px_28px]"
      />

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[440px] animate-fade-in-up">

        {/* Subtle outer glow ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-70 blur-[1px]"
          style={{
            background: 'linear-gradient(135deg, #f97316, #fbbf24)',
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

          {/* ── Heading ──────────────────────────────────────────────────── */}
          <div className="mt-7 mb-6">
            <h1 className="auth-heading font-heading text-[2.15rem] font-bold leading-[1.1] tracking-[-0.03em]">
              {dictionary.auth.welcomeBack}
            </h1>
            <p className="auth-subtitle mt-3 text-[0.9375rem] leading-relaxed">
              {dictionary.auth.continueYourJourney}
            </p>
          </div>

          {/* ── Form (Client Component) ───────────────────────────────── */}
          <LoginForm dictionary={dictionary} locale={locale} />
        </div>

        {/* Bottom gradient line — subtle brand accent */}
        <div
          aria-hidden="true"
          className="absolute -bottom-px left-[15%] right-[15%] h-px opacity-40 blur-[1px]"
          style={{
            background: 'linear-gradient(90deg, #f97316, #fbbf24)',
          }}
        />
      </div>

    </main>
  )
}
