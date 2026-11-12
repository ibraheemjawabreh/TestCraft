import Link from 'next/link'
import type { Locale } from '@/i18n/config'

/**
 * TestCraft_logo.webp is the size-optimized original TestCraft_logo.png.
 * Server Component — zero client bundle cost.
 */
interface LogoProps {
  locale: Locale
  href?: string
  className?: string
  textClassName?: string
}

export function Logo({ locale, href, className, textClassName }: LogoProps) {
  const linkHref = href ?? `/${locale}`
  return (
    <Link
      href={linkHref}
      className={`inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg ${className ?? ''}`}
      prefetch={false}
      aria-label={locale === 'ar' ? 'TestCraft — الرئيسية' : 'TestCraft — Home'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- The original mark is already resized and WebP-encoded. */}
      <img
        src="/TestCraft_logo.webp"
        alt=""
        decoding="async"
        width={36}
        height={36}
        className="size-9 shrink-0 object-contain"
      />
      {/* ── Wordmark ──────────────────────────────────────────────────── */}
      <span dir="ltr" className="site-brand-word font-heading text-lg font-bold tracking-tight select-none">
        <span className={textClassName ?? 'text-foreground'}>
          Test
        </span>
        <span className="font-extrabold text-primary">
          Craft
        </span>
      </span>
    </Link>
  )
}
