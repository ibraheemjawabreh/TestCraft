import { apiUser,apiFailure,checkOrigin,ApiError } from '@/lib/auth/api-auth'
import { seedDemoData } from '@/lib/admin/seeder'
export const runtime='nodejs'
export async function POST(request:Request){
 try{
 checkOrigin(request);const {db}=await apiUser(true)
 if(process.env.ALLOW_DEMO_SEED!=='true')throw new ApiError(403,'Demo seeding is disabled. Import a verified manifest in Curriculum Factory.')
 const backup=await db.rpc('curriculum_backup');if(backup.error)throw backup.error
 return Response.json(await seedDemoData())
 }catch(e){return apiFailure(e)}
}

