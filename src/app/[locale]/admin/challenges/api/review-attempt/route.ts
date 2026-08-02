export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/require-admin'
import { saveAdminAttemptReview } from '@/lib/admin/attempt-review'
import type { Locale } from '@/i18n/config'
import { z } from 'zod'

const reviewSchema = z.object({
  attemptId: z.string().uuid(),
  challengeId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  score: z.number().int().min(0).max(100),
  adminFeedback: z.string().min(1).max(3000),
  isPassed: z.boolean(),
  reportUpdates: z.array(
    z.object({
      id: z.string().uuid(),
      status: z.enum(['Pending', 'Reviewed', 'Rejected']),
      adminClassification: z.enum(['valid_bug', 'duplicate', 'not_a_bug', 'needs_improvement']).optional(),
      matchedHiddenBugId: z.string().uuid().nullable().optional(),
    })
  ),
})

export async function POST(
  request: Request,
  { params: { locale } }: { params: { locale: Locale } }
) {
  try {
    await requireAdmin(locale)

    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await saveAdminAttemptReview(parsed.data)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/review-attempt error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
