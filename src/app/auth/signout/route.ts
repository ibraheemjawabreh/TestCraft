export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { apiFailure, checkOrigin } from '@/lib/auth/api-auth'
import { normalizeAuthLocale } from '@/lib/auth/get-post-login-redirect'

export async function POST(request: Request) {
  try {
    checkOrigin(request, { allowIncomingHost: true })
    const fields = await request.formData().catch(() => null)
    const selectedLocale = fields?.get('locale')
    const cookieLocale = (await cookies()).get('testcraft-locale')?.value
    const locale = normalizeAuthLocale(typeof selectedLocale === 'string' ? selectedLocale : cookieLocale)
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) return new NextResponse(
      locale === 'ar' ? 'تعذّر تسجيل الخروج. حاول مرة أخرى.' : 'Could not sign out. Please try again.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/${locale}/login`, 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return apiFailure(error)
  }
}

