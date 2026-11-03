import { resolveLocale } from '@/lib/locale'
export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createPracticalChallenge } from '@/lib/admin/practical-challenges'
import { practicalChallengeSchema } from '@/lib/validations/practical-challenge'
import type { Locale } from '@/i18n/config'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale: routeLocale } = await params
  const locale = resolveLocale(routeLocale)

  try {
    await requireAdmin(locale)
    const body = await request.json()

    const parsed = practicalChallengeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await createPracticalChallenge(parsed.data)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
