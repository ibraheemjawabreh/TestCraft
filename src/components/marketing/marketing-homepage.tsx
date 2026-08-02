import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingHero } from '@/components/marketing/marketing-hero'
import { MarketingFeatures } from '@/components/marketing/marketing-features'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface MarketingHomepageProps {
  dictionary: Dictionary
  locale: Locale
}

/**
 * MarketingHomepage — self-contained Sunset Tech landing page.
 * All colors are locally scoped to avoid disrupting the app-wide Cyber Violet theme.
 */
export function MarketingHomepage({ dictionary, locale }: MarketingHomepageProps) {
  return (
    <div
      className="min-h-screen antialiased relative overflow-hidden"
      style={{
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'var(--font-plus-jakarta), system-ui, sans-serif',
      }}
    >
      {/* Subtle animated background grid */}
      <div className="fixed inset-0 marketing-grid-bg opacity-40 pointer-events-none" aria-hidden="true" />
      {/* Skip-to-content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        style={{ background: 'linear-gradient(135deg, #f97316, #fbbf24)' }}
      >
        {locale === 'ar' ? 'انتقل إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <MarketingHeader dictionary={dictionary} locale={locale} />

      {/* ── Page Content ─────────────────────────────────────────────────── */}
      <main id="main-content">
        <MarketingHero dictionary={dictionary} locale={locale} />
        <MarketingFeatures dictionary={dictionary} />
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <MarketingFooter dictionary={dictionary} locale={locale} />
    </div>
  )
}
