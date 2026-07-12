import Link from 'next/link'
import type { Locale } from '@/i18n/config'

interface TestcraftLogoProps {
  locale?: Locale
  variant?: 'horizontal' | 'icon-only'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

const sizeMap = {
  sm: { icon: 28, text: 'text-base' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
}

/**
 * TestCraft premium logo component — "Bug + Code Brackets" concept.
 * Fully self-contained SVG; no external image files required.
 * Supports horizontal (icon + wordmark) and icon-only variants.
 */
export function TestcraftLogo({
  locale,
  variant = 'horizontal',
  size = 'md',
  href,
  className = '',
}: TestcraftLogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size]
  const target = href ?? (locale ? `/${locale}` : '/')

  const Icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="sunset-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Hexagon base */}
      <path
        d="M24 3L42.5 14V34L24 45L5.5 34V14L24 3Z"
        fill="url(#sunset-grad)"
        opacity="0.15"
      />
      <path
        d="M24 3L42.5 14V34L24 45L5.5 34V14L24 3Z"
        stroke="url(#sunset-grad)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Code brackets < > */}
      <path
        d="M16 19L10 24L16 29"
        stroke="#f97316"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 19L38 24L32 29"
        stroke="#fbbf24"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bug body — center dot cluster */}
      <circle cx="24" cy="24" r="3" fill="url(#sunset-grad)" />
      {/* Bug antennae */}
      <line x1="22" y1="21" x2="20" y2="17" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="21" x2="28" y2="17" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
      {/* Checkmark overlay */}
      <path
        d="M20.5 24.5L23 27L27.5 22"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  const Wordmark = (
    <span
      className={`font-heading font-bold tracking-tight select-none ${textSize}`}
      style={{ letterSpacing: '-0.02em' }}
    >
      <span className="text-slate-100">Test</span>
      <span
        style={{
          background: 'linear-gradient(135deg, #f97316, #fbbf24)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Craft
      </span>
    </span>
  )

  const content =
    variant === 'icon-only' ? (
      Icon
    ) : (
      <span className="flex items-center gap-2.5">
        {Icon}
        {Wordmark}
      </span>
    )

  return (
    <Link
      href={target}
      className={`inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 rounded-lg ${className}`}
      aria-label="TestCraft — go to home"
    >
      {content}
    </Link>
  )
}
