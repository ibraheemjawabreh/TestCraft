import Link from 'next/link'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'

interface MarketingFooterProps {
  dictionary: Dictionary
  locale: Locale
}

export function MarketingFooter({ dictionary, locale }: MarketingFooterProps) {
  const t = dictionary.marketing.footer
  const year = new Date().getFullYear()

  return (
    <footer
      className="w-full"
      style={{ background: '#0f172a' }}
    >
      {/* Top divider */}
      <div
        className="w-full h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.3), rgba(251,191,36,0.3), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#94a3b8]">

          {/* Copyright */}
          <p className="text-center sm:text-start">
            © {year}{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 600,
              }}
            >
              TestCraft
            </span>
            {' '}—{' '}{t.rights}
          </p>

          {/* Links */}
          <nav
            className="flex items-center gap-6"
            aria-label={locale === 'ar' ? 'روابط الفوتر' : 'Footer links'}
          >
            <Link
              href={`/${locale}/privacy`}
              className="hover:text-[#f8fafc] transition-colors duration-200"
            >
              {t.privacy}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="hover:text-[#f8fafc] transition-colors duration-200"
            >
              {t.terms}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
