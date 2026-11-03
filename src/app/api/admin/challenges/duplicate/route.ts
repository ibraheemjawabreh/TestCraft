import {z} from 'zod'
import {apiUser,apiFailure,checkOrigin,ApiError} from '@/lib/auth/api-auth'
import {createPracticalChallenge} from '@/lib/admin/practical-challenges'
import {practicalChallengeSchema} from '@/lib/validations/practical-challenge'
export const runtime='nodejs'
export async function POST(request:Request){
 try{
 checkOrigin(request);const {db}=await apiUser(true)
 const {id,request_id}=z.object({id:z.string().uuid(),request_id:z.string().uuid()}).strict().parse(await request.json())
 const sourceResult=await db.from('challenges').select('*').eq('id',id).single()
 if(sourceResult.error||!sourceResult.data)throw new ApiError(404,'Challenge unavailable')
 const source=sourceResult.data
 if(!['login_form','registration_form','storefront'].includes(source.practical_app_key||''))throw new ApiError(400,'Choose a supported practical application first')
 const slug=String(source.slug||'challenge').slice(0,58)+'-copy-'+request_id.replaceAll('-','')
 const existing=await db.from('challenges').select('id').eq('slug',slug).maybeSingle()
 if(existing.error)throw existing.error
 if(existing.data)return Response.json({data:existing.data})
 const bugsResult=await db.from('hidden_bugs').select('bug_key,bug_title,description,actual_severity,bonus_xp,is_active').eq('challenge_id',id)
 if(bugsResult.error)throw bugsResult.error
 const input=practicalChallengeSchema.parse({...source,title_en:String(source.title_en).slice(0,110)+' (Copy)',
  title_ar:String(source.title_ar).slice(0,110)+' (نسخة)',slug,is_active:false,sort_order:source.sort_order||1,
  scenario_en:source.scenario_en||'',scenario_ar:source.scenario_ar||'',instructions_en:source.instructions_en||'',instructions_ar:source.instructions_ar||'',
  embedded_bugs:(bugsResult.data||[]).filter(b=>b.bug_key).map(b=>({...b,description:b.description||'',bonus_xp:b.bonus_xp||0}))})
 const backup=await db.rpc('curriculum_backup');if(backup.error)throw backup.error
 const result=await createPracticalChallenge(input)
 if(result.error)throw new ApiError(400,result.error)
 return Response.json({data:result.data})
 }catch(e){return apiFailure(e)}
}
