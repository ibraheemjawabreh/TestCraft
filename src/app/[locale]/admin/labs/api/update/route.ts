import { resolveLocale } from '@/lib/locale'
export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { updateLabTemplate } from '@/lib/admin/lab-templates'
import { labTemplateSchema } from '@/lib/validations/lab-template'
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

    if (!body.id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    const parsed = labTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const payload = {
      name_en: parsed.data.name_en,
      name_ar: parsed.data.name_ar ?? null,
      description_en: parsed.data.description_en ?? null,
      description_ar: parsed.data.description_ar ?? null,
      slug: parsed.data.slug,
      lab_type: parsed.data.lab_type,
      is_active: parsed.data.is_active,
    }

    const result = await updateLabTemplate(body.id, payload)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
