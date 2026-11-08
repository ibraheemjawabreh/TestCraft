import { z } from 'zod'
import { activitySchema } from '@/lib/curriculum/content.schema'
import { curriculumRPC } from '@/lib/curriculum/import-service'
import { apiUser, apiFailure, checkOrigin, readRequestText } from '@/lib/auth/api-auth'

const input = z.object({ lesson_id: z.string().uuid(), expected_updated: z.string().datetime({ offset: true }), practice: z.array(activitySchema).max(30) }).strict().superRefine((v, ctx) => {
  if (new Set(v.practice.map(a => a.slug)).size !== v.practice.length || new Set(v.practice.map(a => a.sort_order)).size !== v.practice.length) ctx.addIssue({ code: 'custom', message: 'Duplicate exercise slugs or ordering' })
})
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { db } = await apiUser(true)
    const body = input.parse(JSON.parse(await readRequestText(request, 2_000_000)))
    return Response.json({ data: await curriculumRPC(db, 'curriculum_save_practice', { p_lesson: body.lesson_id, p_expected_updated: body.expected_updated, p_practice: body.practice }) })
  } catch (error) { return apiFailure(error) }
}
