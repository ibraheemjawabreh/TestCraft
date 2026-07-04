import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import { getPostLoginRedirect, normalizeAuthLocale } from '@/lib/auth/get-post-login-redirect'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth Callback Route Handler
 *
 * Handles Supabase OAuth and magic-link callbacks. Successful sign-in flows are
 * redirected by role: admins to /[locale]/admin, testers to /[locale]/academy.
 * Explicit safe `next` destinations are still honored for non-login flows such
 * as password reset.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const cookieStore = await cookies()
  const locale = normalizeAuthLocale(
    searchParams.get('locale') ?? cookieStore.get('testcraft-locale')?.value,
  )

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      cookieStore.set('testcraft-locale', locale, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })

      if (next && next.startsWith('/') && !next.startsWith('//') && next !== '/academy') {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const redirectPath = await getPostLoginRedirect(locale)
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/register?error=auth_failed`)
}
