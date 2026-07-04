import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { deleteHiddenBug } from '@/lib/admin/hidden-bugs'
import type { Locale } from '@/i18n/config'

export async function POST(
  request: Request,
  { params: { locale } }: { params: { locale: Locale } }
) {
  try {
    // Enforce admin access
    await requireAdmin(locale)

    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    
    const result = await deleteHiddenBug(id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
