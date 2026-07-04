import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createChallenge } from '@/lib/admin/challenges'
import { challengeSchema } from '@/lib/validations/challenge'
import type { Locale } from '@/i18n/config'

export async function POST(
  request: Request,
  { params: { locale } }: { params: { locale: Locale } }
) {
  try {
    // Enforce admin access
    await requireAdmin(locale)

    const body = await request.json()
    
    // Validate payload
    const parsed = challengeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const result = await createChallenge(parsed.data)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
