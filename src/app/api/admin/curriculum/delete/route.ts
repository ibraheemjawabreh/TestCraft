import { apiUser, apiFailure, ApiError, checkOrigin, readRequestText } from '@/lib/auth/api-auth'
import { deletionTargetSchema, deletionRequestSchema } from '@/lib/curriculum/deletion-schema'
import { isCurriculumSchemaError } from '@/lib/curriculum/schema-status'
import type { CurriculumDB } from '@/lib/curriculum/import-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function deletionRPC(db: CurriculumDB, name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args)
  if (error) {
    if (isCurriculumSchemaError(error)) throw new ApiError(503, 'Curriculum deletion is unavailable until the latest database migration is applied.')
    throw new ApiError(error.code === '40001' ? 409 : error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 400, error.message)
  }
  return data
}

export async function GET(request: Request) {
  try {
    const { db } = await apiUser(true)
    const params = new URL(request.url).searchParams
    const target = deletionTargetSchema.parse({ kind: params.get('kind'), id: params.get('id') })
    const data = await deletionRPC(db, 'curriculum_deletion_preview', { p_kind: target.kind, p_id: target.id })
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiFailure(error) }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { db } = await apiUser(true)
    const target = deletionRequestSchema.parse(JSON.parse(await readRequestText(request, 4096)))
    const data = await deletionRPC(db, 'curriculum_delete_subtree', {
      p_kind: target.kind, p_id: target.id, p_confirmation: target.confirmation, p_revision: target.revision,
    })
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiFailure(error) }
}
