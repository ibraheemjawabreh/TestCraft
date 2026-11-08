export const runtime = 'nodejs'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

import { getPostLoginRedirect, normalizeAuthLocale } from '@/lib/auth/get-post-login-redirect'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const cookieStore = await cookies()
  const locale = normalizeAuthLocale(
    searchParams.get('locale') ?? cookieStore.get('testcraft-locale')?.value,
  )

  cookieStore.set('testcraft-locale', locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const redirectPath = await getPostLoginRedirect(locale, searchParams.get('redirectTo'))

  return new NextResponse(null, { status: 307, headers: { Location: redirectPath } })
}

