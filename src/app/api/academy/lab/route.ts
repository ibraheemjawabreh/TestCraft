import { z } from 'zod'
import { apiUser,apiFailure,ApiError,checkOrigin } from '@/lib/auth/api-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { initialState,simulate,type SimApp } from '@/lib/practical-challenges/simulator'
import { assertDB } from '@/lib/curriculum/jobs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const schema=z.object({challenge_id:z.string().uuid(),request_id:z.string().uuid(),
 action:z.object({type:z.enum(['view','reset','login','forgot','register','search','category','cart','checkout']),data:z.record(z.unknown()).optional()}).strict()}).strict()
export async function POST(request:Request){
 try{
 checkOrigin(request)
 const {db,user}=await apiUser()
 const raw=await request.text();if(raw.length>10000)throw new ApiError(413,'Lab action too large')
 const input=schema.parse(JSON.parse(raw))
 const profile=assertDB(await db.from('profiles').select('role').eq('id',user.id).single())
 const admin=profile.role==='admin'
 let query=db.from('challenges').select('id,module_id,is_active,status,practical_app_key').eq('id',input.challenge_id)
 if(!admin)query=query.eq('is_active',true).eq('status','published')
 const {data:challenge,error}=await query.single()
 if(error||!challenge)throw new ApiError(404,'Challenge unavailable')
 if(!admin&&(!challenge.module_id||!assertDB(await db.rpc('curriculum_can_enter_lab',{p_challenge:challenge.id}))))throw new ApiError(403,'Complete all module lessons and prerequisites first')
 if(!['login_form','registration_form','storefront'].includes(challenge.practical_app_key||''))throw new ApiError(400,'Application unavailable')
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new ApiError(503,'The lab server is not configured. Contact the administrator.')
 const service=createServiceClient()
 const {data:prior,error:priorError}=await service.from('practical_lab_events').select('challenge_id,response').eq('user_id',user.id).eq('request_id',input.request_id).maybeSingle()
 if(priorError)throw priorError
 if(prior){
  if(prior.challenge_id!==challenge.id)throw new ApiError(409,'Request ID already used')
  return Response.json({data:prior.response})
 }
 const session=assertDB(await service.from('practical_lab_sessions').select('*').eq('user_id',user.id).eq('challenge_id',challenge.id).maybeSingle())
 let config=session?.private_config,bugs=session?.private_bugs
 if(!session||input.action.type==='reset'){
  const privateChallenge=assertDB(await service.from('challenges').select('practical_app_config').eq('id',challenge.id).single())
  const keys=assertDB(await service.from('hidden_bugs').select('bug_key').eq('challenge_id',challenge.id).eq('is_active',true))
  config=privateChallenge.practical_app_config||{}
  bugs=keys.map(b=>b.bug_key).filter(Boolean)
 }
 const result=simulate(session?.state||initialState(challenge.practical_app_key as SimApp),input.action,bugs,config)
 // Never serialize state, private configuration, active flags or hidden bug rows.
 const response={view:result.view,message:result.message,errors:result.errors}
 const committed=await service.rpc('practical_lab_commit',{p_user:user.id,p_challenge:challenge.id,p_request:input.request_id,
  p_version:session?.version||0,p_state:result.state,p_config:config,p_bugs:bugs,p_response:response})
 if(committed.error)throw new ApiError(409,'Another lab action finished first. Refresh and retry.')
 return Response.json({data:committed.data})
 }catch(e){return apiFailure(e)}
}

