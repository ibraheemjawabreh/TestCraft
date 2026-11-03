// Test-only localhost host: actual React components, production SQL RPCs, deterministic provider.
require('../scripts/register-ts.cjs')
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const {build}=require('esbuild')
const {curriculumManifestSchema,flattenManifest,parseManifestCSV}=require('../src/lib/curriculum/curriculum-manifest.schema.ts')
const {contentBundleSchema,lessonDraftSchema}=require('../src/lib/curriculum/content.schema.ts')
const {simulate,initialState}=require('../src/lib/practical-challenges/simulator.ts')
const {bugReportSchema}=require('../src/lib/validations/bug-report.ts')
const bundle=contentBundleSchema.parse(JSON.parse(fs.readFileSync('content/pilot-bundle.json','utf8')))
const ADMIN='00000000-0000-4000-8000-000000000001',USER='00000000-0000-4000-8000-000000000002'
const migrations=fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20).sort()
let db
const q=async(sql,args=[])=>(await db.query(sql,args)).rows
const rpc=async(name,args)=>{const values=Object.values(args),params=Object.keys(args).map((k,i)=>k+'=> $'+(i+1)).join(',');return(await q('select public.'+name+'('+params+') result',values))[0].result}
const actor=async(id,role='authenticated')=>db.exec("reset role;set role "+role+";set request.jwt.claim.sub='"+id+"'")
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')
async function init(){
 const {PGlite}=await import('@electric-sql/pglite');db=new PGlite()
 await db.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
 for(const f of migrations)await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8').replace(/^\uFEFF/,''))
 await actor(ADMIN)
}
function parse(v){if(typeof v==='string'){try{v=JSON.parse(v)}catch{v=parseManifestCSV(v)}}return v.manifest?{manifest:v.manifest,b:contentBundleSchema.parse(v)}:{manifest:curriculumManifestSchema.parse(v),b:null}}
async function adminAPI(url,body){
 if(!body){
  if(url.searchParams.has('pilot'))return bundle
  if(url.searchParams.has('version')){
   const v=(await q('select to_jsonb(v)||jsonb_build_object(\'lessons\',to_jsonb(l)) version from curriculum_versions v join lessons l on l.id=v.lesson_id where v.id=$1',[url.searchParams.get('version')]))[0].version
   return{version:v,activities:await q('select * from lesson_activities where module_id=$1 order by version desc',[v.lessons.module_id])}
  }
  if(url.searchParams.has('job')){
   const id=url.searchParams.get('job')
   return{job:(await q('select * from curriculum_jobs where id=$1',[id]))[0],items:await q('select * from curriculum_job_items where job_id=$1 order by lesson_key',[id])}
  }
  return{sources:await q('select * from curriculum_sources order by created_at desc'),
   jobs:await q('select * from curriculum_jobs order by created_at desc'),
   versions:await q("select v.id,v.lesson_id,v.status,v.created_at,to_jsonb(l) lessons from curriculum_versions v join lessons l on l.id=v.lesson_id order by v.created_at desc"),
   attempts:await q("select a.*,jsonb_build_object('body',l.body) lesson_activities from activity_attempts a join lesson_activities l on l.id=a.activity_id where a.status='needs_review'")}
 }
 if(['validate','dry_run','import','start'].includes(body.action)){
  const {manifest,b}=parse(body.payload),entries=flattenManifest(manifest)
  if(body.action==='validate')return{valid:true,lessons:entries.length,authored_drafts:b?.lessons.length||0}
  if(body.action==='dry_run')return{insert:{paths:manifest.paths.length,modules:manifest.paths[0].modules.length,lessons:entries.length},overwrite:0,publish:0,conflicts:[],cost:{ceiling_per_request_usd:0.1,fixture:true}}
  const imported=await rpc('curriculum_import',{p_manifest:JSON.stringify(manifest),p_fingerprint:hash(manifest),p_lessons:JSON.stringify(body.action==='import'?b?.lessons||[]:[]),p_assessments:JSON.stringify(body.action==='import'?b?.module_assessments||[]:[])})
  if(body.action==='import')return imported
  const selection=body.selection.length?entries.filter(l=>body.selection.includes(l.key)):entries
  const id=await rpc('curriculum_start_job',{p_source:imported.source_id,p_manifest:JSON.stringify(manifest),p_specs:JSON.stringify(selection),p_requests:body.max_requests,p_cost:body.max_cost_usd,p_config:JSON.stringify({model:'deterministic-fixture',request_ceiling_usd:0.1}),p_regenerate:body.regenerate})
  return{job_id:id}
 }
 if(body.action==='tick'){
  const claim=await rpc('curriculum_claim',{p_job:body.job_id})
  if(claim){
   const lesson=bundle.lessons.find(l=>l.key===claim.spec.key)
   await rpc('curriculum_finish',{p_item:claim.item_id,p_token:claim.claim_token,p_output:JSON.stringify({lesson,module_assessment:claim.spec.next_key?[]:bundle.module_assessments.find(m=>m.module_key===claim.spec.path_slug+'/'+claim.spec.module_slug).activities}),p_error:null,p_retry:true,p_actual_cost:0})
  }return{processed:!!claim}
 }
 if(['pause','resume'].includes(body.action)){await q('update curriculum_jobs set status=$1 where id=$2',[body.action==='pause'?'paused':'queued',body.job_id]);return{status:body.action==='pause'?'paused':'queued'}}
 if(body.action==='apply')return rpc('curriculum_apply_version',{p_version:body.version_id,p_expected_updated:body.expected_updated})
 if(body.action==='publish')return rpc('curriculum_publish',{p_lesson:body.lesson_id,p_acknowledged:body.acknowledged})
 if(body.action==='export'){const id=await rpc('curriculum_backup',{});return(await q('select payload from curriculum_backups where id=$1',[id]))[0].payload}
 if(body.action==='edit_revision'){
  const d=lessonDraftSchema.parse(body.payload),v=(await q('select v.*,l.updated_at current_updated from curriculum_versions v join lessons l on l.id=v.lesson_id where v.id=$1',[body.version_id]))[0]
  return(await q("insert into curriculum_versions(lesson_id,fingerprint,body,base_updated_at,created_by) values($1,$2,$3::jsonb,$4,$5) on conflict(lesson_id,fingerprint) do update set fingerprint=excluded.fingerprint returning id",[v.lesson_id,hash(d),JSON.stringify(d),v.current_updated,ADMIN]))[0]
 }
 if(body.action==='review_attempt'){await q("update activity_attempts set status='reviewed',score=$1,review_feedback=$2,reviewed_by=$3 where id=$4",[body.score,body.feedback,ADMIN,body.attempt_id]);return{reviewed:true}}
 if(body.action==='edit_assessment')return rpc('curriculum_stage_assessment',{p_module:body.module_id,p_activities:JSON.stringify(body.payload)})
 throw Error('Unsupported fixture action')
}
async function seedLabs(){
 const module=(await q("select * from learning_modules where slug='intro-to-qa'"))[0]
 // Explicit fixture preconditions: publish and complete all three module lessons.
 for(const lesson of await q('select id from lessons where module_id=$1',[module.id])){
  await rpc('curriculum_publish',{p_lesson:lesson.id,p_acknowledged:true})
  await q('insert into lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now()) on conflict do nothing',[USER,lesson.id])
 }
 for(const app of ['login_form','registration_form','storefront']){
  const exists=(await q('select id from challenges where slug=$1',['fixture-'+app]))[0]
  if(exists)continue
  const cid=(await q("insert into challenges(slug,module_id,learning_path_id,is_active,is_required,status,practical_app_key,practical_app_config) values($1,$2,$3,true,false,'published',$4,'{}') returning id",['fixture-'+app,module.id,module.learning_path_id,app]))[0].id
  const key={login_form:'invalid_email_validation_missing',registration_form:'password_confirmation_ignored',storefront:'cart_quantity_total_wrong'}[app]
  await rpc('curriculum_sync_bugs',{p_challenge:cid,p_bugs:JSON.stringify([{bug_key:key,bug_title:'Controlled '+app+' defect',description:'Private fixture answer',actual_severity:'Medium',bonus_xp:25,is_active:true}])})
 }
}


async function dispatch(req,res){
 const url=new URL(req.url,'http://127.0.0.1:3207')
 const role=url.searchParams.get('role')||(req.headers.cookie||'').match(/fixture-role=(admin|tester)/)?.[1]||'tester'
 const uid=role==='admin'?ADMIN:USER
 function json(value,status=200){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))}
 try{
 if(url.pathname==='/health'){res.end('ready');return}
 if(url.pathname==='/__fixture/reset'){await db.close();await init();json({ok:true});return}
 if(url.pathname==='/ui.js'||url.pathname==='/ui.css'){res.setHeader('Content-Type',url.pathname.endsWith('js')?'text/javascript':'text/css');res.end(fs.readFileSync('.test-output'+url.pathname));return}
 await actor(uid)
 let body=null;if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;body=JSON.parse(raw||'{}')}
 if(url.pathname==='/__fixture/seed-labs'){await actor(ADMIN);await seedLabs();json({ok:true});return}
 if(url.pathname==='/__fixture/state'){
  await actor(ADMIN)
  json({lessons:await q('select id,slug,is_published from lessons'),attempts:await q('select * from challenge_attempts'),reports:await q('select * from bug_reports'),xp:await q('select * from xp_transactions'),jobs:await q('select * from curriculum_jobs')});return
 }
 if(url.pathname==='/api/admin/curriculum'){
  if(role!=='admin'){json({error:'Forbidden'},403);return}
  json({data:await adminAPI(url,body)});return
 }
 if(url.pathname==='/api/academy/activities'){
  if(!body){
   const activities=await rpc('curriculum_get_activities',{p_lesson:url.searchParams.get('lesson')})
   const attempts=await q('select id,activity_id,status,score,feedback,review_feedback,created_at from activity_attempts where user_id=$1 order by created_at desc',[uid])
   json({data:{activities,attempts}});return
  }
  const result=await rpc('curriculum_submit_activity',{p_activity:body.activity_id,p_request:body.request_id,p_selected:JSON.stringify(body.selected),p_text:body.text})
  json({data:result});return
 }
 if(url.pathname==='/api/academy/lab'){
  const c=(await q("select * from challenges where id=$1 and is_active and status='published'",[body.challenge_id]))[0]
  if(!c)throw Error('Challenge unavailable')
  const allowed=await rpc('curriculum_can_enter_lab',{p_challenge:c.id});if(!allowed)throw Error('Module locked')
  await actor(uid,'service_role')
  const session=(await q('select * from practical_lab_sessions where user_id=$1 and challenge_id=$2',[uid,c.id]))[0]
  const bugs=(session&&body.action.type!=='reset')?session.private_bugs:(await q('select bug_key from hidden_bugs where challenge_id=$1 and is_active',[c.id])).map(b=>b.bug_key)
  const result=simulate(session?.state||initialState(c.practical_app_key),body.action,bugs,{})
  const response={view:result.view,message:result.message,errors:result.errors}
  const data=await rpc('practical_lab_commit',{p_user:uid,p_challenge:c.id,p_request:body.request_id,p_version:session?.version||0,p_state:JSON.stringify(result.state),p_config:'{}',p_bugs:JSON.stringify(bugs),p_response:JSON.stringify(response)})
  json({data});return
 }
 if(url.pathname==='/api/academy/reports'){
  const parsed=bugReportSchema.parse(body)
  let attempt=(await q("select id from challenge_attempts where user_id=$1 and challenge_id=$2 and status in ('started','submitted') order by id limit1".replace('limit1','limit 1'),[uid,body.challengeId]))[0]
  if(!attempt)attempt=(await q("insert into challenge_attempts(user_id,challenge_id,status,is_passed) values($1,$2,'started',false) returning id",[uid,body.challengeId]))[0]
  const report=(await q("insert into bug_reports(user_id,challenge_id,attempt_id,title,environment,evidence_url,request_id,steps_to_reproduce,expected_result,actual_result,reported_severity) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id",
   [uid,body.challengeId,attempt.id,parsed.title,parsed.environment,parsed.evidence_url||null,body.request_id,parsed.steps_to_reproduce,parsed.expected_result,parsed.actual_result,parsed.reported_severity]))[0]
  await q("update challenge_attempts set status='submitted' where id=$1",[attempt.id])
  json({id:report.id},201);return
 }
 if(url.pathname.endsWith('/admin/challenges/api/review-attempt')){
  if(role!=='admin'){json({error:'Forbidden'},403);return}
  for(const r of body.reportUpdates)await q('update bug_reports set status=$1,admin_classification=$2,matched_hidden_bug_id=$3 where id=$4 and attempt_id=$5',[r.status==='Pending'?'Reviewed':r.status,r.adminClassification||'valid_bug',r.matchedHiddenBugId||null,r.id,body.attemptId])
  await q('update challenge_attempts set status=$1,is_passed=$2,admin_feedback=$3,reviewed_by=$4,reviewed_at=now() where id=$5',[body.status,body.isPassed,body.adminFeedback,ADMIN,body.attemptId])
  if(body.status==='approved')await rpc('curriculum_award_challenge',{p_attempt:body.attemptId,p_found:body.foundHiddenBugIds})
  json({success:true});return
 }
 const view=url.searchParams.get('view')||'admin',locale=url.searchParams.get('locale')==='ar'?'ar':'en'
 const fixture={view,locale}
 if(view==='lesson'){
  const l=(await q("select * from lessons where is_published order by sort_order limit1".replace('limit1','limit 1')))[0]
  fixture.lesson={...l,title:l['title_'+locale],content:l['content_'+locale],summary:l['summary_'+locale],objectives:l['objectives_'+locale],is_completed:false,is_locked:false,learning_path_title:locale==='ar'?'أساسيات ضمان الجودة':'QA Foundations'}
 }
 if(view==='lab'){
  fixture.app=url.searchParams.get('app')||'login_form'
  fixture.challenge=(await q('select id,slug from challenges where slug=$1',['fixture-'+fixture.app]))[0]
  fixture.reports=await q('select id,title,status,environment,evidence_url,admin_feedback,created_at from bug_reports where user_id=$1 and challenge_id=$2',[uid,fixture.challenge.id])
 }
 if(view==='review'){
  if(role!=='admin')throw Error('Administrator required')
  const attempt=(await q('select * from challenge_attempts order by created_at desc limit1'.replace('limit1','limit 1')))[0]
  const challenge=(await q('select * from challenges where id=$1',[attempt.challenge_id]))[0]
  fixture.review={attempt,challenge:{...challenge,title:'Controlled QA challenge'},tester:{username:'Fixture tester',total_xp:0,current_level:1},
   reports:await q('select * from bug_reports where attempt_id=$1',[attempt.id]),hiddenBugs:await q('select * from hidden_bugs where challenge_id=$1',[attempt.challenge_id])}
 }
 res.setHeader('Set-Cookie','fixture-role='+role+'; Path=/; SameSite=Strict')
 res.setHeader('Content-Type','text/html; charset=utf-8')
 const data=JSON.stringify(fixture).replaceAll('<','\\u003c')
 res.end('<!doctype html><html lang="'+locale+'"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ui.css"></head><body><div id="root"></div><script>window.__FIXTURE__='+data+'</script><script src="/ui.js"></script></body></html>')
 }catch(e){json({error:e.message},400)}
}
async function main(){
 fs.mkdirSync('.test-output',{recursive:true})
 await build({entryPoints:['tests/ui-entry.tsx'],bundle:true,outfile:'.test-output/ui.js',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},
 plugins:[{name:'test-only-next-router',setup(b){
  b.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'fixture-next'}))
  b.onLoad({filter:/.*/,namespace:'fixture-next'},args=>({loader:'js',resolveDir:process.cwd(),contents:args.path==='next/link'?
   "import React from 'react';export default function Link(p){return React.createElement('a',p,p.children)}":
   "export function useRouter(){return{refresh(){},push(url){window.location.href=url},replace(url){window.location.href=url}}}"}))
 }}]})
 await init()
 let queue=Promise.resolve()
 http.createServer((req,res)=>{queue=queue.then(()=>dispatch(req,res)).catch(e=>{res.statusCode=500;res.end('Fixture failure')})}).listen(3207,'127.0.0.1',()=>console.log('Isolated component fixture ready on127.0.0.1:3207'))
}
main().catch(e=>{console.error(e);process.exitCode=1})



