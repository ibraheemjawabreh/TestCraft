import { apiUser, apiFailure, checkOrigin } from '@/lib/auth/api-auth'
import { createPracticalChallenge } from '@/lib/admin/practical-challenges'
import { practicalChallengeSchema } from '@/lib/validations/practical-challenge'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    checkOrigin(request)
    await apiUser(true)
    const parsed = practicalChallengeSchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

    const result = await createPracticalChallenge(parsed.data)
    if (result.error) return Response.json({ error: result.error }, { status: 400 })
    return Response.json({ data: result.data })
  } catch (error) {
    return apiFailure(error)
  }
}
