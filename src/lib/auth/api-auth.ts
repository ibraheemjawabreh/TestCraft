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
  if (error instanceof SyntaxError) return Response.json({error:'Malformed JSON'},{status:400})
  if (error instanceof Error && error.name==='ZodError') return Response.json({error:'Validation failed',details:JSON.parse(error.message)},{status:400})
  console.error('TestCraft API failure', error instanceof Error ? error.name : 'UnknownError')
  return Response.json({error:'Operation failed. Check migrations, connection and server configuration.'},{status:500})
}


export async function readRequestText(request:Request,limit=10000):Promise<string>{
 const declared=Number(request.headers.get('content-length')||0)
 if(declared>limit)throw new ApiError(413,'Request exceeds the allowed size')
 const reader=request.body?.getReader()
 if(!reader)return ''
 const decoder=new TextDecoder();let bytes=0,text=''
 try{
  while(true){
   const {value,done}=await reader.read()
   if(done)break
   bytes+=value.byteLength
   if(bytes>limit){await reader.cancel();throw new ApiError(413,'Request exceeds the allowed size')}
   text+=decoder.decode(value,{stream:true})
  }
  return text+decoder.decode()
 }finally{reader.releaseLock()}
}
