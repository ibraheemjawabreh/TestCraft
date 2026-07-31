import Link from 'next/link'
import { Sparkles, Rocket, ArrowRight } from 'lucide-react'

import { Logo } from '@/components/brand/Logo'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface MarketingHeroProps {
  dictionary: Dictionary
  locale: Locale
}

export function MarketingHero({ dictionary, locale }: MarketingHeroProps) {
  const t = dictionary.marketing.hero

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249,115,22,0.22) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 50% 100%, rgba(251,191,36,0.08) 0%, transparent 60%),
          #0f172a
        `,
        minHeight: '92vh',
      }}
      aria-labelledby="hero-heading"
    >
      {/* ── Background grid pattern ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(#f97316 1px, transparent 1px),
            linear-gradient(90deg, #f97316 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      {/* ── Glow orbs ──────────────────────────────────────────────────── */}
      <div
        className="absolute top-1/4 start-1/4 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-[80px]"
        style={{ background: 'radial-gradient(circle, #f97316, transparent)' }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 end-1/4 w-48 h-48 rounded-full pointer-events-none opacity-15 blur-[60px]"
        style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }}
        aria-hidden="true"
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-28 md:py-40 text-center">

        {/* Pill badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-4 py-1.5 text-sm font-medium text-[#fbbf24] backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t.badge}
        </div>

        {/* Main headline */}
        <h1
          id="hero-heading"
          className="font-heading font-bold tracking-tight text-[#f8fafc] mb-6"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
          }}
        >
          <span className="block">{t.titlePrefix}{' '}</span>
          <span
            className="block"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 60%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '200% auto',
            }}
          >
            {t.titleGradientOne}
          </span>
          <span className="block text-[#f8fafc]">{t.titleSuffix}</span>
        </h1>

        {/* Subheadline */}
        <p
          className="mb-10 max-w-2xl text-lg leading-relaxed text-[#94a3b8]"
          style={{ lineHeight: '1.75' }}
        >
          {t.subtitle}
        </p>

        {/* CTA group */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Primary CTA */}
          <Link
            href={`/${locale}/register`}
            className="group relative inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_60px_-20px_rgba(251,191,36,0.7)]"
            style={{
              background: 'linear-gradient(135deg, #f97316, #fbbf24)',
              boxShadow: '0 10px 40px -10px rgba(249,115,22,0.55)',
            }}
          >
            <Rocket className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
            {t.primaryCta}
          </Link>

          {/* Secondary CTA */}
          <Link
            href="#tracks"
            className="group inline-flex items-center gap-2.5 rounded-xl border border-[#334155] bg-[#1e293b]/40 px-8 py-4 text-base font-semibold text-[#f8fafc] backdrop-blur-sm transition-all duration-300 hover:border-[#f97316]/50 hover:bg-[#1e293b]/70 hover:shadow-[0_8px_30px_-8px_rgba(249,115,22,0.25)]"
          >
            {t.secondaryCta}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* Hero Logo Icon — large centered mark */}
        <div
          className="mt-20 opacity-60 pointer-events-none"
          style={{
            filter: 'drop-shadow(0 0 40px rgba(249,115,22,0.35))',
            transform: 'scale(1.5)',
          }}
          aria-hidden="true"
        >
          <Logo locale={locale} textClassName="text-white" />
        </div>

        {/* Floating stats strip */}
        <div className="mt-16 flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
          {[
            { value: locale === 'ar' ? '١٠٠٠+' : '1,000+', label: locale === 'ar' ? 'متعلم نشط' : 'Active learners' },
            { value: locale === 'ar' ? '٥٠+' : '50+', label: locale === 'ar' ? 'تحدي عملي' : 'Practical challenges' },
            { value: locale === 'ar' ? '٩٥٪' : '95%', label: locale === 'ar' ? 'معدل رضا المتعلمين' : 'Learner satisfaction' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span
                className="font-heading text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </span>
              <span className="text-sm text-[#94a3b8]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
