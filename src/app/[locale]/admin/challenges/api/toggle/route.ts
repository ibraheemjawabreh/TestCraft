export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { toggleChallengeStatus } from '@/lib/admin/challenges'
import type { Locale } from '@/i18n/config'

export async function POST(
  request: Request,
  { params: { locale } }: { params: { locale: Locale } }
) {
  try {
    // Enforce admin access
    await requireAdmin(locale)

    const body = await request.json()
    const { id, is_active } = body

    if (!id || typeof id !== 'string' || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    
    const result = await toggleChallengeStatus(id, is_active)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
