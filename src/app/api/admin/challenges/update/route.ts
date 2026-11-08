import { z } from 'zod'
import { apiUser, apiFailure, checkOrigin, ApiError } from '@/lib/auth/api-auth'
import { updatePracticalChallenge } from '@/lib/admin/practical-challenges'
import { practicalChallengeSchema } from '@/lib/validations/practical-challenge'

export const runtime = 'nodejs'

const idSchema = z.string().uuid()

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    await apiUser(true)
    const body = await request.json()
    const parsedId = idSchema.safeParse(body?.id)
    if (!parsedId.success) throw new ApiError(400, 'Valid challenge ID is required')
    const { id: _id, ...challengeData } = body
    const parsed = practicalChallengeSchema.safeParse(challengeData)
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

    const result = await updatePracticalChallenge(parsedId.data, parsed.data)
    if (result.error) return Response.json({ error: result.error }, { status: 400 })
    return Response.json({ data: result.data })
  } catch (error) {
    return apiFailure(error)
  }
}
