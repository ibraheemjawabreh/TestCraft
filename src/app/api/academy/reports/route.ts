import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitBugReport, submitAttempt } from '@/lib/academy/reports'
import type { Database } from '@/types/database.types'

type SeverityLevel = Database['public']['Enums']['severity_level']

interface RequestBody {
  challengeId: string
  labTemplateId?: string | null
  title: string
  steps_to_reproduce: string
  expected_result: string
  actual_result: string
  reported_severity: SeverityLevel
}

/**
 * POST /api/academy/reports
 * Submits a bug report AND immediately transitions the attempt to "submitted"
 * so the admin can see it for review. user_id is always from the server session.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'tester') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<RequestBody>

    if (
      !body.challengeId ||
      !body.title ||
      !body.steps_to_reproduce ||
      !body.expected_result ||
      !body.actual_result ||
      !body.reported_severity
    ) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    // 1. Save the bug report (creates/reuses an attempt internally)
    const result = await submitBugReport({
      userId: user.id,
      challengeId: body.challengeId,
      labTemplateId: body.labTemplateId ?? null,
      title: body.title,
      steps_to_reproduce: body.steps_to_reproduce,
      expected_result: body.expected_result,
      actual_result: body.actual_result,
      reported_severity: body.reported_severity,
    })

    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error || 'Unknown error' }, { status: 400 })
    }

    // 2. Find the active attempt and submit it (started → submitted)
    // This ensures the admin sees the report immediately in the submissions page.
    const { data: activeAttempt } = await supabase
      .from('challenge_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', body.challengeId)
      .eq('status', 'started')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeAttempt) {
      // Transition attempt from started → submitted (non-blocking, best effort)
      void submitAttempt(user.id, body.challengeId, activeAttempt.id)
    }

    return NextResponse.json({ id: result.data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
