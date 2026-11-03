import { z } from 'zod'
import { apiUser,apiFailure,checkOrigin,ApiError } from '@/lib/auth/api-auth'
import { initialState,simulate,type SimState } from '@/lib/practical-challenges/simulator'
export const runtime='nodejs'
export async function POST(request:Request){
 try{
 checkOrigin(request);await apiUser(true)
 const raw=await request.text();if(raw.length>30000)throw new ApiError(413,'Preview request too large')
 const input=z.object({app:z.enum(['login_form','registration_form','storefront']),config:z.record(z.unknown()),
 bugs:z.array(z.string()).max(30),state:z.unknown().optional(),action:z.object({type:z.string(),data:z.record(z.unknown()).optional()})}).parse(JSON.parse(raw))
 const result=simulate((input.state as SimState)||initialState(input.app),input.action,input.bugs,input.config)
 // Admin preview may retain private state; this route always verifies administrator role.
 return Response.json({data:result})
 }catch(e){return apiFailure(e)}
}

