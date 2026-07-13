'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OAuthButtonProps {
  /** Currently only Google is supported. Extend as needed. */
  provider: 'google'
  /** Button label. Defaults to "Continue with Google". */
  label?: string
  /**
   * Externally controlled disabled state.
   * Use this when the main form is already submitting to prevent parallel requests.
   */
  disabled?: boolean
  /**
   * Path to redirect to after successful OAuth.
   * Defaults to /auth/callback which then redirects to /academy.
   * Must be a relative path (e.g. "/auth/callback").
   */
  redirectPath?: string
}

// ─── Provider Icon ────────────────────────────────────────────────────────────

/** Official Google "G" SVG — no external image dependency. */
function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.121 17.64 11.813 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── OAuthButton ─────────────────────────────────────────────────────────────

/**
 * Generic OAuth sign-in/sign-up button.
 *
 * Supabase's `signInWithOAuth` handles both sign-in and sign-up in a single
 * call — if the user doesn't have an account, it creates one automatically.
 * The on_auth_user_created trigger then creates the matching profile row.
 *
 * Security notes:
 * - The redirectTo URL uses `window.location.origin` (never hardcoded).
 * - The `redirectPath` is validated to be a relative path.
 * - Duplicate clicks are prevented by the internal loading state.
 */
export function OAuthButton({
  provider,
  label = 'Continue with Google',
  disabled = false,
  redirectPath = '/auth/callback',
}: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick(): Promise<void> {
    // Guard: prevent duplicate OAuth requests
    if (isLoading || disabled) return

    // Ensure the redirect path is relative (prevent open redirect)
    const safePath = redirectPath.startsWith('/') ? redirectPath : '/auth/callback'

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${safePath}`,
          queryParams: {
            // Ensures Google returns a refresh_token on subsequent logins
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      // signInWithOAuth causes a full-page redirect — we only reach here on error
      if (error) {
        setIsLoading(false)
      }
    } catch {
      // Reset on unexpected errors so the user can retry
      setIsLoading(false)
    }
  }

  const isDisabled = isLoading || disabled

  return (
    <Button
      type="button"
      variant="outline"
      size="xl"
      className={[
        'w-full gap-3',
        'auth-social-button',
        'active:scale-[0.98]',
        'transition-all duration-200',
      ].join(' ')}
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-label={label}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <GoogleIcon />
      )}
      <span>{label}</span>
    </Button>
  )
}
