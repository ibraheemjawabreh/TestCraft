import { z } from 'zod'
import { apiUser, apiFailure, checkOrigin, readRequestText } from '@/lib/auth/api-auth'
import { curriculumRPC, previewCurriculum, prepareCurriculum } from '@/lib/curriculum/import-service'
import { curriculumJSONDownload } from '@/lib/curriculum/downloads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview'), payload: z.unknown() }).strict(),
  z.object({ action: z.literal('prepare'), payload: z.unknown(), revision: z.string().regex(/^[a-f0-9]{32}$/) }).strict(),
  z.object({ action: z.literal('batch'), source_id: z.string().uuid(), offset: z.number().int().min(0).max(10000) }).strict(),
  z.object({ action: z.literal('backup') }).strict(),
])
export async function GET() {
  try {
    const { db } = await apiUser(true)
    const data = await curriculumRPC(db, 'curriculum_export_json')
    return curriculumJSONDownload(data.document, 'export')
  } catch (error) { return apiFailure(error) }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { db } = await apiUser(true)
    const body = input.parse(JSON.parse(await readRequestText(request, 25_000_000)))
    if (body.action === 'preview') return Response.json({ data: await previewCurriculum(db, body.payload) })
    if (body.action === 'prepare') return Response.json({ data: await prepareCurriculum(db, body.payload, body.revision) })
    if (body.action === 'batch') return Response.json({ data: await curriculumRPC(db, 'curriculum_import_json_batch', { p_source: body.source_id, p_offset: body.offset, p_limit: 25 }) })
    const id = await curriculumRPC(db, 'curriculum_backup')
    const { data, error } = await db.from('curriculum_backups').select('payload').eq('id', id).single()
    if (error) throw new Error(error.message)
    return Response.json({ data: data.payload })
  } catch (error) { return apiFailure(error) }
}
