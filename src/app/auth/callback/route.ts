export const runtime = 'nodejs'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import { getPostLoginRedirect, normalizeAuthLocale } from '@/lib/auth/get-post-login-redirect'
import { createClient } from '@/lib/supabase/server'
import { safeLearningRedirect, withLearningRedirect } from '@/lib/auth/learning-redirect'

/**
 * Auth Callback Route Handler
 *
 * Handles Supabase OAuth and magic-link callbacks. Successful sign-in flows are
 * redirected by role: admins to /[locale]/admin, testers to Student Home.
 * Explicit safe `next` destinations are still honored for non-login flows such
 * as password reset.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const cookieStore = await cookies()
  const locale = normalizeAuthLocale(
    searchParams.get('locale') ?? cookieStore.get('testcraft-locale')?.value,
  )
  const destination = safeLearningRedirect(searchParams.get('redirectTo'), locale)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      cookieStore.set('testcraft-locale', locale, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })

      // Keep the existing recovery and settings destinations. Learning
      // redirects take the role-aware allowlisted path below.
      if (next === '/settings' || next === '/update-password') {
        return new NextResponse(null, { status: 307, headers: { Location: "/" + locale + next } })
      }

      const redirectPath = await getPostLoginRedirect(locale, destination)
      return new NextResponse(null, { status: 307, headers: { Location: redirectPath } })
    }
  }

  return new NextResponse(null, { status: 307, headers: {
    Location: next === '/update-password' ? '/' + locale + '/forgot-password?error=invalid_link'
      : withLearningRedirect('/' + locale + '/register?error=auth_failed', destination),
  } })
}

