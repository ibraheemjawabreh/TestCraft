import Link from 'next/link'

/**
 * TestCraft brand logo — gradient "TC" mark + wordmark.
 * Uses Space Grotesk (loaded via next/font in the root layout).
 * Server Component — zero client bundle cost.
 */
export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      aria-label="TestCraft — go to home"
    >
      {/* ── Logo mark ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={[
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          'bg-cyber-gradient',
          'shadow-glow-sm group-hover:shadow-glow-primary',
          'transition-shadow duration-300',
        ].join(' ')}
      >
        {/* Subtle inner highlight */}
        <div className="absolute inset-[1px] rounded-[7px] bg-white/10" />
        <span className="relative font-heading text-[0.75rem] font-bold tracking-wide text-white select-none">
          TC
        </span>
      </div>

      {/* ── Wordmark ──────────────────────────────────────────────────── */}
      <span className="font-heading text-[1.1rem] font-semibold tracking-[-0.01em] text-white select-none">
        Test
        <span className="bg-cyber-gradient bg-clip-text text-transparent font-bold">
          Craft
        </span>
      </span>
    </Link>
  )
}
