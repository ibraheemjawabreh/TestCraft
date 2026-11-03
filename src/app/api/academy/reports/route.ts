import { z } from 'zod'
import { checkOrigin } from '@/lib/auth/api-auth'
export const runtime = 'nodejs'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { submitBugReport, submitAttempt } from '@/lib/academy/reports'
import type { Database } from '@/types/database.types'

type SeverityLevel = Database['public']['Enums']['severity_level']

interface RequestBody {
  environment: string
  evidence_url?: string
  request_id: string
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
    checkOrigin(request)
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

    if (!profile || !['tester','student'].includes(profile.role)) {
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

    const context = z.object({ environment:z.string().trim().min(3).max(500),request_id:z.string().uuid(),evidence_url:z.string().max(2000).optional() }).parse(body)
    // 1. Save the bug report (creates/reuses an attempt internally)
    const result = await submitBugReport({
      environment:context.environment,
      evidence_url:context.evidence_url,
      request_id:context.request_id,
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

    // 2. Find the active attempt and submit it (started â†’ submitted)
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
      // Transition attempt from started â†’ submitted (non-blocking, best effort)
      await submitAttempt(user.id, body.challengeId, activeAttempt.id)
    }

    return NextResponse.json({ id: result.data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

