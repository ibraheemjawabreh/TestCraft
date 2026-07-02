import type { Metadata } from 'next'

import { Logo } from '@/components/brand/Logo'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in to TestCraft and continue your QA engineering journey.',
}

/**
 * Login page — Server Component shell.
 *
 * Layout:
 *   • Full-viewport dark background (#050510)
 *   • Two atmospheric gradient orbs (violet + cyan) with blur
 *   • Subtle dot-grid overlay for depth
 *   • Centered glassmorphism card with violet border glow
 *   • Logo → heading → subtitle → LoginForm (client)
 *
 * The heavy interactive logic lives in LoginForm.tsx (Client Component).
 * This page itself has zero client-side bundle cost.
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] px-4 py-12">

      {/* ── Atmospheric background ──────────────────────────────────────── */}

      {/* Top-left violet orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#7c3aed]/25 blur-[120px] animate-glow-pulse"
      />

      {/* Bottom-right cyan orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-[#22d3ee]/15 blur-[120px] animate-glow-pulse [animation-delay:2.5s]"
      />

      {/* Center ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c3aed]/8 blur-[80px]"
      />

      {/* Dot-grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(124,58,237,0.07)_1px,transparent_1px)] bg-[size:28px_28px]"
      />

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[440px] animate-fade-in-up">

        {/* Subtle outer glow ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl bg-cyber-gradient opacity-[0.07]"
        />

        {/* Glass card */}
        <div
          className={[
            'relative rounded-2xl',
            'border border-[#7c3aed]/14',
            'bg-[#0f0f1f]/75 backdrop-blur-2xl',
            'px-8 py-9 shadow-card',
            'sm:px-10',
          ].join(' ')}
        >
          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Logo />

          {/* ── Heading ──────────────────────────────────────────────────── */}
          <div className="mt-7 mb-6">
            <h1 className="font-heading text-[2.15rem] font-bold leading-[1.1] tracking-[-0.03em] text-white">
              Welcome{' '}
              <span className="bg-cyber-gradient bg-clip-text text-transparent">
                back
              </span>
            </h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[#6b7a99]">
              Continue your QA journey.
            </p>
          </div>

          {/* ── Form (Client Component) ───────────────────────────────── */}
          <LoginForm />
        </div>

        {/* Bottom gradient line — subtle brand accent */}
        <div
          aria-hidden="true"
          className="absolute -bottom-px left-[15%] right-[15%] h-px bg-cyber-gradient opacity-30 blur-[1px]"
        />
      </div>

    </main>
  )
}
