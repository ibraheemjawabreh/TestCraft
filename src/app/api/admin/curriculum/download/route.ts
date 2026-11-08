import { z } from 'zod'
import { apiUser, apiFailure, ApiError, checkOrigin } from '@/lib/auth/api-auth'
import { curriculumRPC } from '@/lib/curriculum/import-service'
import { curriculumJSONDownload } from '@/lib/curriculum/downloads'
import example from '../../../../../../public/curriculum/example.json'
import schema from '../../../../../../public/curriculum/schema.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const file = z.enum(['schema', 'example', 'export', 'backup']).parse(params.get('file'))
    const { db } = await apiUser(true)
    if (file === 'backup') {
      const id = z.string().uuid().parse(params.get('id'))
      const { data, error } = await db.from('curriculum_backups').select('payload').eq('id', id).single()
      if (error || !data) throw new ApiError(404, 'Backup not found')
      return curriculumJSONDownload(data.payload, file)
    }
    if (file === 'schema') return curriculumJSONDownload(schema, file)
    if (file === 'example') return curriculumJSONDownload(example, file)
    const snapshot = await curriculumRPC(db, 'curriculum_export_json')
    return curriculumJSONDownload(snapshot.document, file)
  } catch (error) { return apiFailure(error) }
}

// Backups create an immutable snapshot, so keep this a guarded POST rather than a GET.
export async function POST(request: Request) {
  try {
    checkOrigin(request)
    z.literal('backup').parse(new URL(request.url).searchParams.get('file'))
    const { db } = await apiUser(true)
    const id = await curriculumRPC(db, 'curriculum_backup')
    const { data, error } = await db.from('curriculum_backups').select('payload').eq('id', id).single()
    if (error) throw new Error(error.message)
    return curriculumJSONDownload(data.payload, 'backup')
  } catch (error) { return apiFailure(error) }
}
