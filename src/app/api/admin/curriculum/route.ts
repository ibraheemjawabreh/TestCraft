import { z } from 'zod'
import { apiUser, apiFailure, checkOrigin, ApiError , readRequestText } from '@/lib/auth/api-auth'
import { curriculumManifestSchema, flattenManifest, parseManifestCSV } from '@/lib/curriculum/curriculum-manifest.schema'
import { contentBundleSchema, lessonDraftSchema, activitySchema } from '@/lib/curriculum/content.schema'
import { startJob, processJob, assertDB, fingerprint } from '@/lib/curriculum/jobs'
import { providerConfig } from '@/lib/curriculum/provider'
import pilot from '../../../../../content/pilot-bundle.json'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
const uuid=z.string().uuid()
const inputSchema=z.object({
 action:z.enum(['validate','dry_run','import','start','tick','pause','resume','apply','publish','export','edit_revision','review_attempt','edit_assessment']),
 payload:z.unknown().optional(),job_id:uuid.optional(),version_id:uuid.optional(),lesson_id:uuid.optional(),
 expected_updated:z.string().datetime({offset:true}).optional(),acknowledged:z.boolean().optional(),
 selection:z.array(z.string()).max(2000).default([]),max_requests:z.number().int().min(1).max(10000).optional(),
 max_cost_usd:z.number().positive().max(10000).optional(),regenerate:z.boolean().default(false),
 module_id:uuid.optional(),attempt_id:uuid.optional(),score:z.number().int().min(0).max(1).optional(),feedback:z.string().min(10).max(3000).optional()
}).strict()
function parsePayload(value:unknown){
 let input=value
 if(typeof input==='string'){
  try{input=JSON.parse(input)}catch{input=parseManifestCSV(input as string)}
 }
 if(input&&typeof input==='object'&&'manifest' in input){
  const b=contentBundleSchema.parse(input);return{manifest:b.manifest,bundle:b}
 }
 return{manifest:curriculumManifestSchema.parse(input),bundle:null}
}
export async function GET(request:Request){
 try{
 const {db}=await apiUser(true)
 const query=new URL(request.url).searchParams
 if(query.get('pilot')==='true')return Response.json({data:pilot})
 if(query.get('version')||query.get('lesson')){
  const v=assertDB(await db.from('curriculum_versions').select('*,lessons(*)').eq(query.get('version')?'id':'lesson_id',uuid.parse(query.get('version')||query.get('lesson'))).order('created_at',{ascending:false}).limit(1).single())
  const activities=assertDB(await db.from('lesson_activities').select('*').eq('module_id',v.lessons.module_id).order('version',{ascending:false}))
  return Response.json({data:{version:v,activities}})
 }
 if(query.get('job')){
  const id=uuid.parse(query.get('job'))
  const job=assertDB(await db.from('curriculum_jobs').select('*').eq('id',id).single())
  const items=assertDB(await db.from('curriculum_job_items').select('id,lesson_key,status,attempts,error,next_attempt_at').eq('job_id',id).order('lesson_key'))
  return Response.json({data:{job,items}})
 }
 const offset=z.coerce.number().int().min(0).max(1000000).parse(query.get('offset')||0)
 const [sources,jobs,versions,attempts]=await Promise.all([
 db.from('curriculum_sources').select('id,manifest,created_at').order('created_at',{ascending:false}).limit(30),
 db.from('curriculum_jobs').select('*').order('created_at',{ascending:false}).limit(30),
 db.from('curriculum_versions').select('id,lesson_id,status,created_at,lessons(title_en,title_ar,is_published,updated_at)').order('created_at',{ascending:false}).range(offset,offset+99),
 db.from('activity_attempts').select('id,user_id,response,status,activity_id,created_at,lesson_activities(body)').eq('status','needs_review').order('created_at').limit(50)
 ])
 return Response.json({data:{sources:assertDB(sources),jobs:assertDB(jobs),versions:assertDB(versions),attempts:assertDB(attempts),has_more:versions.data?.length===100}})
 }catch(e){return apiFailure(e)}
}
export async function POST(request:Request){
 try{
 checkOrigin(request)
 const {db,user}=await apiUser(true)
 const raw=await readRequestText(request,25000000)
 if(Buffer.byteLength(raw)>25_000_000)throw new ApiError(413,'Maximum import size is 25 MB')
 const input=inputSchema.parse(JSON.parse(raw))
 let backup:any=null
 if(typeof input.payload==='string'){try{const parsed=JSON.parse(input.payload);if(parsed.format==='testcraft-master-backup-v1')backup=parsed}catch{}}
 else if(input.payload&&typeof input.payload==='object'&&'format' in input.payload)backup=input.payload
 if(backup&&['validate','dry_run','import','start'].includes(input.action)){
  const rows=z.array(z.record(z.string(),z.unknown())).max(20000)
  backup=z.object({format:z.literal('testcraft-master-backup-v1'),learning_paths:rows,learning_modules:rows,lessons:rows,activities:rows,sources:rows,versions:rows,challenges:rows,hidden_bugs:rows,prerequisites:rows.optional().default([])}).passthrough().parse(backup)
  if(input.action==='validate')return Response.json({data:{valid:true,backup:true,paths:backup.learning_paths.length,modules:backup.learning_modules.length,lessons:backup.lessons.length,activities:backup.activities.length}})
  if(input.action==='dry_run'){
   const existing=assertDB(await db.from('learning_paths').select('id').limit(1))
   return Response.json({data:{backup:true,insert:{paths:backup.learning_paths.length,lessons:backup.lessons.length},publish:0,conflicts:existing.length?['Backup restore requires an empty, explicitly enabled TEST database']:[]}})
  }
  if(input.action==='import'){
   if(!input.acknowledged)throw new ApiError(400,'Explicit test-restore approval required')
   return Response.json({data:assertDB(await db.rpc('curriculum_restore_test_backup',{p_payload:backup,p_confirmation:'RESTORE_EMPTY_TEST_DATABASE'}))})
  }
  throw new ApiError(400,'Use a verified source manifest to generate, or validate/import this backup into an empty test database')
 }
 if(['validate','dry_run','import','start'].includes(input.action)){
  const {manifest,bundle}=parsePayload(input.payload)
  const entries=flattenManifest(manifest)
  if(input.action==='validate')return Response.json({data:{valid:true,source:manifest.source,paths:manifest.paths.length,modules:manifest.paths.reduce((n,p)=>n+p.modules.length,0),lessons:entries.length,authored_drafts:bundle?.lessons.length||0}})
  if(input.action==='dry_run'){
   const paths=assertDB(await db.from('learning_paths').select('id,slug'))
   const modules=assertDB(await db.from('learning_modules').select('id,slug,learning_path_id'))
   const lessons=assertDB(await db.from('lessons').select('id,slug,learning_path_id,module_id,is_published,content_en'))
   let newPaths=0,newModules=0,newLessons=0,existing=0
   const conflicts:string[]=[]
   for(const p of manifest.paths){
    const pRow=paths.find(x=>x.slug===p.path_slug);if(!pRow)newPaths++
    for(const m of p.modules){
     const mRow=modules.find(x=>x.slug===m.module_slug&&x.learning_path_id===pRow?.id);if(!mRow)newModules++
     for(const l of m.lessons){
      const row=lessons.find(x=>x.slug===l.lesson_slug&&x.learning_path_id===pRow?.id)
      if(row){existing++;if(row.module_id!==mRow?.id)conflicts.push(p.path_slug+'/'+l.lesson_slug)}else newLessons++
     }
    }
   }
   let cost:unknown={available:false,reason:'Server model/key/pricing configuration required'}
   try{const config=providerConfig();cost={available:true,ceiling_per_request_usd:config.request_ceiling_usd,
    selected_lessons:input.selection.length||entries.length,max_run_reservation_usd:Math.min(input.max_cost_usd||0,(input.max_requests||0)*config.request_ceiling_usd),model:config.model}}catch{}
   return Response.json({data:{insert:{paths:newPaths,modules:newModules,lessons:newLessons},existing_lessons:existing,overwrite:0,publish:0,conflicts,cost}})
  }
  if(input.action==='import'){
   const data=assertDB(await db.rpc('curriculum_import',{p_manifest:manifest,p_fingerprint:fingerprint(manifest),p_lessons:bundle?.lessons||[],p_assessments:bundle?.module_assessments||[]}))
   return Response.json({data})
  }
  if(!input.max_requests||!input.max_cost_usd)throw new ApiError(400,'Set explicit request and USD limits')
  const id=await startJob(db,user.id,manifest,input.selection,input.max_requests,input.max_cost_usd,input.regenerate)
  return Response.json({data:{job_id:id}})
 }
 if(input.action==='tick')return Response.json({data:await processJob(db,uuid.parse(input.job_id))})
 if(input.action==='pause'||input.action==='resume'){
  const id=uuid.parse(input.job_id)
  const job=assertDB(await db.from('curriculum_jobs').select('status').eq('id',id).single())
  if(!['queued','running','paused','failed'].includes(job.status))throw new ApiError(409,'Run cannot resume in this state. Create a new run with an explicit budget.')
  const status=input.action==='pause'?'paused':'queued'
  assertDB(await db.from('curriculum_jobs').update({status,updated_at:new Date().toISOString()}).eq('id',id))
  return Response.json({data:{status}})
 }
 if(input.action==='apply'){
  if(!input.acknowledged)throw new ApiError(400,'Explicit approval to replace the draft is required')
  const version=assertDB(await db.from('curriculum_versions').select('body').eq('id',uuid.parse(input.version_id)).single())
  lessonDraftSchema.parse(version.body)
  return Response.json({data:assertDB(await db.rpc('curriculum_apply_version',{p_version:input.version_id,p_expected_updated:input.expected_updated}))})
 }
 if(input.action==='publish'){
  if(!input.acknowledged)throw new ApiError(400,'Explicit publication approval required')
  return Response.json({data:assertDB(await db.rpc('curriculum_publish',{p_lesson:uuid.parse(input.lesson_id),p_acknowledged:true}))})
 }
 if(input.action==='edit_revision'){
  const draft=lessonDraftSchema.parse(input.payload)
  const v=assertDB(await db.from('curriculum_versions').select('*,lessons(updated_at)').eq('id',uuid.parse(input.version_id)).single())
  if(v.body.key!==draft.key)throw new ApiError(400,'Revision identity cannot change')
  // Save a new version; old versions/attempts remain intact.
  const hash=fingerprint(draft)
  const prior=assertDB(await db.from('curriculum_versions').select('id').eq('lesson_id',v.lesson_id).eq('fingerprint',hash).maybeSingle())
  const data=prior || assertDB(await db.from('curriculum_versions').insert({lesson_id:v.lesson_id,fingerprint:hash,body:draft,
   base_updated_at:v.lessons.updated_at,created_by:user.id,status:'needs_review'}).select('id').single())
  return Response.json({data})
 }
 if(input.action==='edit_assessment'){
  const activities=z.array(activitySchema).min(3).max(10).parse(input.payload)
  return Response.json({data:assertDB(await db.rpc('curriculum_stage_assessment',{p_module:uuid.parse(input.module_id),p_activities:activities}))})
 }
 if(input.action==='review_attempt'){
  const result=assertDB(await db.from('activity_attempts').update({status:'reviewed',score:z.number().int().min(0).max(1).parse(input.score),
   review_feedback:z.string().min(10).max(3000).parse(input.feedback),reviewed_by:user.id,reviewed_at:new Date().toISOString()})
   .eq('id',uuid.parse(input.attempt_id)).eq('status','needs_review').select('id').single())
  return Response.json({data:result})
 }
 const bid=assertDB(await db.rpc('curriculum_backup'))
 const exportedBackup=assertDB(await db.from('curriculum_backups').select('payload').eq('id',bid).single())
 return Response.json({data:exportedBackup.payload})
 }catch(e){return apiFailure(e)}
}
