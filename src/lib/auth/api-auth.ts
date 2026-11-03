import 'server-only'
import { createClient } from '@/lib/supabase/server'
export class ApiError extends Error {
  constructor(public status:number, message:string) { super(message) }
}
export async function apiUser(admin=false) {
  const db = await createClient()
  const {data:{user},error} = await db.auth.getUser()
  if (error || !user) throw new ApiError(401,'Authentication required')
  if (admin) {
    const {data:profile,error:profileError} = await db.from('profiles').select('role').eq('id',user.id).single()
    if (profileError || profile?.role!=='admin') throw new ApiError(403,'Administrator required')
  }
  return {db,user}
}
export function checkOrigin(request:Request) {
  const origin = request.headers.get('origin')
  if (origin && origin!==new URL(request.url).origin) throw new ApiError(403,'Cross-origin mutation rejected')
}
export function apiFailure(error:unknown) {
  if (error instanceof ApiError) return Response.json({error:error.message},{status:error.status})
  if (error instanceof Error && error.name==='ZodError') return Response.json({error:'Validation failed',details:JSON.parse(error.message)},{status:400})
  console.error('TestCraft API failure', error instanceof Error ? error.name : 'UnknownError')
  return Response.json({error:'Operation failed. Check migrations, connection and server configuration.'},{status:500})
}

