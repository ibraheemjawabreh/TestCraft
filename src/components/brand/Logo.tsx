import Link from 'next/link'
import Image from 'next/image'
import type { Locale } from '@/i18n/config'

/**
 * TestCraft brand logo — uses TestCraft_logo.png + high-contrast Wordmark.
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
      aria-label="TestCraft — go to home"
    >
      <Image
        src="/TestCraft_logo.png"
        alt="TestCraft Logo"
        width={160}
        height={40}
        priority
        className="h-10 w-auto object-contain"
      />
      {/* ── Wordmark ──────────────────────────────────────────────────── */}
      <span className="font-heading text-xl font-bold tracking-tight select-none flex items-center">
        <span className={textClassName ?? 'text-foreground dark:text-white'}>
          Test
        </span>
        <span className="bg-gradient-to-r from-[#f97316] via-[#fb923c] to-[#fbbf24] bg-clip-text text-transparent font-extrabold ms-0.5 drop-shadow-sm">
          Craft
        </span>
      </span>
    </Link>
  )
}
