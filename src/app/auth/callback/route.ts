import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Auth Callback Route Handler
 *
 * Handles two flows:
 *
 * 1. Google / OAuth redirect
 *    Supabase sends a one-time `code` query param after the user grants consent.
 *    We exchange it for a session via `exchangeCodeForSession`, which also fires
 *    the on_auth_user_created trigger (creating the profile row if needed).
 *
 * 2. Password reset
 *    Same flow — the magic link contains a `code` and `next=/update-password`.
 *
 * Security notes:
 * - The `next` param is validated to be a relative path (no open redirects).
 * - No tokens are logged or exposed in responses.
 * - Failed exchanges redirect to /register with a safe error indicator.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/academy'

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Strict relative-path check — prevents open redirect attacks
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/academy'
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Exchange failed (invalid/expired code, or no code provided)
  // Redirect to register with a non-sensitive error indicator in the query string
  return NextResponse.redirect(`${origin}/register?error=auth_failed`)
}
