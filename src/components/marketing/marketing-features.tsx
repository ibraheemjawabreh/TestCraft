import { Bug, Code2, BadgeCheck } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'

interface MarketingFeaturesProps {
  dictionary: Dictionary
}

export function MarketingFeatures({ dictionary }: MarketingFeaturesProps) {
  const t = dictionary.marketing.features

  const features = [
    {
      key: 'bugHunting',
      title: t.bugHunting.title,
      description: t.bugHunting.description,
      Icon: Bug,
      iconBg: 'rgba(249,115,22,0.12)',
      iconBorder: 'rgba(249,115,22,0.3)',
      iconColor: '#f97316',
    },
    {
      key: 'automation',
      title: t.automation.title,
      description: t.automation.description,
      Icon: Code2,
      iconBg: 'rgba(251,191,36,0.10)',
      iconBorder: 'rgba(251,191,36,0.28)',
      iconColor: '#fbbf24',
    },
    {
      key: 'jobReady',
      title: t.jobReady.title,
      description: t.jobReady.description,
      Icon: BadgeCheck,
      iconBg: 'rgba(249,115,22,0.12)',
      iconBorder: 'rgba(249,115,22,0.3)',
      iconColor: '#fb923c',
    },
  ]

  return (
    <section
      id="tracks"
      className="w-full py-24 md:py-32"
      style={{ background: '#0f172a' }}
      aria-labelledby="features-heading"
    >
      {/* ── Divider glow ──────────────────────────────────────────────────── */}
      <div
        className="w-full h-px mb-24"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(251,191,36,0.4), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="mb-16 text-center animate-fade-in-up">
          <h2
            id="features-heading"
            className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-[#f8fafc] mb-4"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#94a3b8] leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* ── Feature cards grid ─────────────────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const { Icon } = feature
            const staggerClass = ['stagger-1', 'stagger-2', 'stagger-3'][index] ?? 'stagger-1'
            return (
              <article
                key={feature.key}
                className={`
                  group relative rounded-2xl border p-8
                  glass-surface card-glow-hover
                  animate-fade-in-up opacity-0 ${staggerClass}
                `}
                style={{
                  background: 'rgba(30,41,59,0.55)',
                  borderColor: '#334155',
                }}
              >
                {/* Top corner subtle glow (pure CSS, no JS) */}
                <div
                  className="absolute top-0 end-0 w-28 h-28 rounded-full pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl"
                  style={{ background: feature.iconColor }}
                  aria-hidden="true"
                />

                {/* Icon badge */}
                <div
                  className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: feature.iconBg,
                    borderColor: feature.iconBorder,
                  }}
                >
                  <Icon
                    className="h-7 w-7"
                    style={{ color: feature.iconColor }}
                    aria-hidden="true"
                  />
                </div>

                {/* Title */}
                <h3 className="mb-3 font-heading text-xl font-bold text-[#f8fafc]">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[#94a3b8] leading-relaxed text-sm">
                  {feature.description}
                </p>

                {/* Bottom accent line on hover */}
                <div
                  className="absolute bottom-0 start-0 end-0 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24, transparent)' }}
                  aria-hidden="true"
                />
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
