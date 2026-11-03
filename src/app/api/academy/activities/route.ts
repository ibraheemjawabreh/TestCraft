import { z } from 'zod'
import { apiUser, apiFailure, checkOrigin, ApiError } from '@/lib/auth/api-auth'
import { submissionSchema } from '@/lib/curriculum/grading'
import { assertDB } from '@/lib/curriculum/jobs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 try{
 const {db,user}=await apiUser()
 const lesson=z.string().uuid().parse(new URL(request.url).searchParams.get('lesson'))
 const activities=assertDB(await db.rpc('curriculum_get_activities',{p_lesson:lesson}))||[]
 const ids=activities.map((a:{id:string})=>a.id)
 const attempts=ids.length?assertDB(await db.from('activity_attempts')
 .select('id,activity_id,status,score,feedback,review_feedback,created_at').eq('user_id',user.id).in('activity_id',ids).order('created_at',{ascending:false})):[]
 return Response.json({data:{activities,attempts}})
 }catch(e){return apiFailure(e)}
}
export async function POST(request:Request){
 try{
 checkOrigin(request)
 const {db}=await apiUser()
 const raw=await request.text();if(raw.length>10000)throw new ApiError(413,'Response too large')
 const s=submissionSchema.parse(JSON.parse(raw))
 const result=await db.rpc('curriculum_submit_activity',{p_activity:s.activity_id,p_request:s.request_id,p_selected:s.selected,p_text:s.text})
 if(result.error)throw new ApiError(400,'Complete the prerequisites and submit a valid response.')
 return Response.json({data:result.data})
 }catch(e){return apiFailure(e)}
}

