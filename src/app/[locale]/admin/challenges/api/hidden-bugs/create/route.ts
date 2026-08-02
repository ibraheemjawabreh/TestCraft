export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createHiddenBug } from '@/lib/admin/hidden-bugs'
import { hiddenBugSchema } from '@/lib/validations/challenge'
import type { Locale } from '@/i18n/config'

export async function POST(
  request: Request,
  { params: { locale } }: { params: { locale: Locale } }
) {
  try {
    // Enforce admin access
    await requireAdmin(locale)

    const body = await request.json()
    const { challenge_id, ...input } = body

    if (!challenge_id || typeof challenge_id !== 'string') {
      return NextResponse.json({ error: 'Invalid challenge ID' }, { status: 400 })
    }
    
    // Validate payload
    const parsed = hiddenBugSchema.safeParse(input)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const result = await createHiddenBug(challenge_id, parsed.data)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
