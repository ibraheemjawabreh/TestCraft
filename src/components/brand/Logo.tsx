import Link from 'next/link'
import Image from 'next/image'
import type { Locale } from '@/i18n/config'

/**
 * TestCraft brand logo — uses TestCraft_logo.png + Wordmark
 * Server Component — zero client bundle cost.
 */
interface LogoProps {
  locale: Locale
  href?: string
}

export function Logo({ locale, href }: LogoProps) {
  const linkHref = href ?? `/${locale}`
  return (
    <Link
      href={linkHref}
      className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
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
      <span className="font-heading text-[1.1rem] font-semibold tracking-[-0.01em] text-slate-900 dark:text-white select-none">
        Test
        <span className="bg-gradient-to-r from-[#f97316] to-[#fbbf24] bg-clip-text text-transparent font-bold">
          Craft
        </span>
      </span>
    </Link>
  )
}
