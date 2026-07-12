import type { Metadata } from 'next'

import { TestcraftLogo } from '@/components/marketing/testcraft-logo'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { getDictionary } from '@/i18n/get-dictionary'
import { type Locale } from '@/i18n/config'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LanguageSwitcher } from '@/components/language/language-switcher'

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Create your free TestCraft account and start your QA engineering journey with real-world testing challenges.',
}

export default async function RegisterPage({ params: { locale } }: { params: { locale: Locale } }) {
  const dictionary = await getDictionary(locale)

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 transition-colors"
      style={{
        background: '#0f172a',
      }}
    >
      {/* ── Top-right Controls ────────────────────────────────────────── */}
      <div className="absolute top-6 end-6 z-50 flex items-center gap-4 animate-fade-in-up">
        <ThemeToggle dictionary={dictionary} />
        <LanguageSwitcher dictionary={dictionary} locale={locale} />
      </div>

      {/* ── Atmospheric background ──────────────────────────────────────── */}

      {/* Top-right Sunset orange/gold orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#f97316]/18 blur-[120px] animate-glow-pulse"
      />

      {/* Bottom-left gold orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -left-64 h-[600px] w-[600px] rounded-full bg-[#fbbf24]/12 blur-[120px] animate-glow-pulse [animation-delay:2.5s]"
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
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-[0.15]"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f97316)',
          }}
        />

        {/* Glass card */}
        <div
          className={[
            'relative rounded-2xl',
            'border border-[#334155]/60',
            'bg-[#1e293b]/75 backdrop-blur-2xl',
            'px-8 py-9',
            'sm:px-10',
          ].join(' ')}
          style={{
            boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.7), 0 0 0 1px rgba(249, 115, 22, 0.05)',
          }}
        >
          {/* ── Logo ─────────────────────────────────────────────────── */}
          <TestcraftLogo locale={locale} size="sm" />

          {/* ── Heading ──────────────────────────────────────────────── */}
          <div className="mt-7 mb-6">
            <h1 className="font-heading text-[2.05rem] font-bold leading-[1.1] tracking-[-0.03em] text-[#f8fafc]">
              {dictionary.auth.createAccount}
            </h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[#94a3b8]">
              {dictionary.auth.continueYourJourney}
            </p>
          </div>

          {/* ── Form (Client Component) ───────────────────────────────── */}
          <RegisterForm dictionary={dictionary} locale={locale} />
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
