/**
 * AuthDivider — renders a full-width "OR" separator between primary and
 * OAuth login options. Intentionally a Server Component.
 */
export function AuthDivider() {
  return (
    <div className="relative flex items-center" role="separator" aria-label="or">
      {/* Left line */}
      <div className="flex-1 border-t border-border/60" />

      {/* Label */}
      <span className="mx-4 shrink-0 text-[0.6875rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 select-none">
        or
      </span>

      {/* Right line */}
      <div className="flex-1 border-t border-border/60" />
    </div>
  )
}
