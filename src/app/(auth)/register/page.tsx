import type { Metadata } from 'next'

import { Logo } from '@/components/brand/Logo'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Create your free TestCraft account and start your QA engineering journey with real-world testing challenges.',
}

/**
 * Register page — Server Component shell.
 *
 * Visual design:
 *  • Identical Cyber Violet background to the login page for brand consistency.
 *  • The top orb is cyan (accent) instead of violet to differentiate the page.
 *  • Slightly wider card (max-w-[480px]) to accommodate the extra form fields.
 *  • Logo centred at the top with gradient heading below.
 *  • All interactive logic lives in RegisterForm.tsx (Client Component).
 *
 * This file has zero client-side JavaScript bundle cost.
 */
export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] px-4 py-12">

      {/* ── Atmospheric background ──────────────────────────────────────── */}

      {/* Top-right cyan orb — intentionally different from login's violet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#22d3ee]/18 blur-[120px] animate-glow-pulse"
      />

      {/* Bottom-left violet orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -left-64 h-[600px] w-[600px] rounded-full bg-[#7c3aed]/20 blur-[120px] animate-glow-pulse [animation-delay:2.5s]"
      />

      {/* Subtle center ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22d3ee]/6 blur-[80px]"
      />

      {/* Dot-grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:28px_28px]"
      />

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[480px] animate-fade-in-up">

        {/* Outer glow ring */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl bg-cyber-gradient-r opacity-[0.07]"
        />

        {/* Glass card */}
        <div
          className={[
            'relative rounded-2xl',
            'border border-[#22d3ee]/12',
            'bg-[#0f0f1f]/75 backdrop-blur-2xl',
            'px-8 py-9 shadow-card',
            'sm:px-10',
          ].join(' ')}
        >
          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Logo />

          {/* ── Heading ──────────────────────────────────────────────── */}
          <div className="mt-7 mb-6">
            <h1 className="font-heading text-[2.05rem] font-bold leading-[1.1] tracking-[-0.03em] text-white">
              Create your{' '}
              <span className="bg-cyber-gradient-r bg-clip-text text-transparent">
                account
              </span>
            </h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[#6b7a99]">
              Start your QA journey with real-world testing challenges.
            </p>
          </div>

          {/* ── Form (Client Component) ───────────────────────────────── */}
          <RegisterForm />
        </div>

        {/* Bottom gradient line */}
        <div
          aria-hidden="true"
          className="absolute -bottom-px left-[15%] right-[15%] h-px bg-cyber-gradient-r opacity-30 blur-[1px]"
        />
      </div>

    </main>
  )
}
