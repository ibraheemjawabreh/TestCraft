import { z } from 'zod'
import { ApiError, apiFailure, apiUser, checkOrigin, readRequestText } from '@/lib/auth/api-auth'
import { markLessonInProgress } from '@/lib/academy/services/ProgressService'

const input = z.object({ lessonId: z.string().uuid(), hasProgress: z.boolean() }).strict()

export async function POST(request: Request) {
  try {
    checkOrigin(request, { allowIncomingHost: true })
    const { lessonId, hasProgress } = input.parse(JSON.parse(await readRequestText(request, 1024)))
    const { db, user } = await apiUser()
    const [profile, { data: lesson, error }] = await Promise.all([
      db.from('profiles').select('role').eq('id', user.id).single(),
      db.from('lessons').select('id,module_id')
        .eq('id', lessonId).eq('is_published', true).is('archived_at', null).maybeSingle(),
    ])
    if (profile.error || !['tester', 'student'].includes(profile.data?.role)) throw new ApiError(403, 'Student required')
    if (error || !lesson) throw new ApiError(404, 'Lesson unavailable')
    if (lesson.module_id) {
      const { data: allowed, error: gateError } = await db.rpc('curriculum_can_read_lesson', { p_lesson: lessonId })
      if (gateError || !allowed) throw new ApiError(403, 'Lesson unavailable')
    }
    const result = await markLessonInProgress(user.id, lessonId, hasProgress, db)
    if (result.error) throw new ApiError(500, result.error)
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return apiFailure(error)
  }
}
