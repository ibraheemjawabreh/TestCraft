import { z } from 'zod'
import { apiUser, apiFailure, checkOrigin, ApiError } from '@/lib/auth/api-auth'

export const runtime = 'nodejs'

const inputSchema = z.object({ id: z.string().uuid() }).strict()

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    const { db } = await apiUser(true)
    const { id } = inputSchema.parse(await request.json())
    const { data: challenge, error: lookupError } = await db
      .from('challenges')
      .select('id, title')
      .eq('id', id)
      .single()

    if (lookupError || !challenge) throw new ApiError(404, 'Challenge not found')

    // Archive without deleting attempts, reports, or reward references.
    const { error } = await db
      .from('challenges')
      .update({ is_active: false, status: 'archived' })
      .eq('id', id)

    if (error) throw error
    return Response.json({ success: true, archived: challenge.title })
  } catch (error) {
    return apiFailure(error)
  }
}
