require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const bundle=JSON.parse(fs.readFileSync('content/pilot-bundle.json','utf8'))
const ADMIN='00000000-0000-4000-8000-000000000001',TESTER='00000000-0000-4000-8000-000000000002',OTHER='00000000-0000-4000-8000-000000000003'
test('isolated PostgreSQL migration, RLS, import, review, publication, attempts and budgets',async(t)=>{
 const {PGlite}=await import('@electric-sql/pglite')
 const db=new PGlite()
 const q=async(sql,args=[]) => (await db.query(sql,args)).rows
 const actor=async(id,role='authenticated')=>db.exec("reset role;set role "+role+";set request.jwt.claim.sub='"+id+"'")
 try{
 await db.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
 for(const migration of ['020_practical_challenge_security.sql','021_curriculum_factory.sql','022_curriculum_jobs.sql','023_practical_lab_sessions.sql','024_curriculum_backup_and_bug_history.sql'])
  await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8').replace(/^\uFEFF/,''))
 await actor(ADMIN)
 const load=async()=> (await q('select curriculum_import($1::jsonb,$2,$3::jsonb,$4::jsonb) result',
 [JSON.stringify(bundle.manifest),'verified-pilot',JSON.stringify(bundle.lessons),JSON.stringify(bundle.module_assessments)]))[0].result
 await t.test('import real authored pilot and repeat without duplicates',async()=>{
  const first=await load();assert.equal(first.inserted_lessons,9);assert.equal(first.published,0)
  const ids=await q('select id,slug from lessons order by slug')
  const second=await load();assert.equal(second.inserted_lessons,0)
  assert.deepEqual(await q('select id,slug from lessons order by slug'),ids)
  assert.equal((await q('select count(*)::int n from lesson_activities'))[0].n,36)
  assert.equal((await q('select count(*)::int n from lessons where is_published'))[0].n,0)
  assert.equal((await q('select count(*)::int n from curriculum_backups'))[0].n,2)
 })
 const firstLesson=(await q("select * from lessons where slug='software-testing-fundamentals'"))[0]
 await t.test('preserve manual edits, enforce optimistic revision apply, never overwrite published lessons',async()=>{
  await q("update lessons set content_en=content_en||' Manual editorial note.',updated_at=now() where id=$1",[firstLesson.id])
  await load()
  assert.match((await q('select content_en from lessons where id=$1',[firstLesson.id]))[0].content_en,/Manual editorial note/)
  const revision={...bundle.lessons[0],summary_en:bundle.lessons[0].summary_en+' Reviewed for clarity.'}
  await q("insert into curriculum_versions(lesson_id,fingerprint,body,base_updated_at,created_by) select id,'fresh-review',$2::jsonb,updated_at,$3 from lessons where id=$1",
   [firstLesson.id,JSON.stringify(revision),ADMIN])
  const v=(await q("select * from curriculum_versions where fingerprint='fresh-review'"))[0]
  await assert.rejects(()=>q('select curriculum_apply_version($1,$2)',[v.id,firstLesson.updated_at]),/changed/)
  await q('select curriculum_apply_version($1,$2)',[v.id,v.base_updated_at])
  assert.equal((await q('select summary_en from lessons where id=$1',[firstLesson.id]))[0].summary_en,revision.summary_en)
  assert.equal((await q('select count(*)::int n from lesson_activities where lesson_id=$1 and retired',[firstLesson.id]))[0].n,3)
  await q('select curriculum_publish($1,true)',[firstLesson.id])
  assert.equal((await q('select is_published from lessons where id=$1',[firstLesson.id]))[0].is_published,true)
 })
 await t.test('tester cannot read answer bodies/keys, mutate curriculum, or publish',async()=>{
  await actor(TESTER)
  assert.equal((await q('select * from lesson_activities')).length,0)
  assert.equal((await q('select * from hidden_bugs')).length,0)
  await assert.rejects(()=>load(),/Administrator/)
  await assert.rejects(()=>q('select curriculum_publish($1,true)',[firstLesson.id]),/approval/)
  await assert.rejects(()=>q("insert into curriculum_sources(fingerprint,manifest) values('attack','{}')"),/row-level security/)
 })
 let publicActivities
 await t.test('public DTO contains no keys/rubrics/explanations; objective grading is idempotent and retakes preserve history',async()=>{
  publicActivities=(await q('select curriculum_get_activities($1) result',[firstLesson.id]))[0].result
  const own=publicActivities.filter(a=>!a.module_assessment)
  assert.equal(own.length,3)
  assert.doesNotMatch(JSON.stringify(publicActivities),/"answer"|"rubric"|"explanation"/)
  const activity=own.find(a=>a.kind==='scenario'),rid='10000000-0000-4000-8000-000000000001'
  const submit=()=>q("select curriculum_submit_activity($1,$2,'[\"a\"]','') result",[activity.id,rid])
  const first=(await submit())[0].result;assert.equal(first.score,1)
  const retry=(await submit())[0].result;assert.equal(first.id,retry.id)
  await q("select curriculum_submit_activity($1,$2,'[\"b\"]','')",[activity.id,'10000000-0000-4000-8000-000000000002'])
  assert.equal((await q('select count(*)::int n from activity_attempts'))[0].n,2)
  await assert.rejects(()=>q("select curriculum_submit_activity($1,$2,'[\"unknown\"]','')",[activity.id,'10000000-0000-4000-8000-000000000003']),/Invalid/)
 })
 let openAttempt
 await t.test('open response remains needs_review; other users cannot see it or edit scores',async()=>{
  const open=publicActivities.find(a=>a.kind==='short_answer')
  openAttempt=(await q("select curriculum_submit_activity($1,$2,'[]',$3) result",
  [open.id,'10000000-0000-4000-8000-000000000004','Expected Wednesday; actual Tuesday on build D17 at Monday14:05 shop local time.']))[0].result
  assert.equal(openAttempt.status,'needs_review');assert.equal(openAttempt.score,null)
  const changed=await q("update activity_attempts set score=1 where id=$1 returning id",[openAttempt.id]);assert.equal(changed.length,0)
  await actor(OTHER)
  assert.equal((await q('select * from activity_attempts')).length,0)
  await actor(ADMIN)
  await q("update activity_attempts set status='reviewed',score=1,review_feedback='Complete evidence and correct expectation.',reviewed_by=$2,reviewed_at=now() where id=$1",[openAttempt.id,ADMIN])
  await actor(TESTER)
  assert.equal((await q('select status from activity_attempts where id=$1',[openAttempt.id]))[0].status,'reviewed')
 })
 await t.test('budget reserve, duplicate clicks, pause, stale leases and partial resume',async()=>{
  await actor(ADMIN)
  const source=(await q("select id from curriculum_sources where fingerprint='verified-pilot'"))[0].id
  const {flattenManifest}=require('../src/lib/curriculum/curriculum-manifest.schema.ts')
  const specs=flattenManifest(bundle.manifest).slice(0,2)
  const cfg={model:'fixture',request_ceiling_usd:0.1,input_usd_per_million:1,output_usd_per_million:1,max_output_tokens:16000,max_input_bytes:48000}
  const start=async()=> (await q('select curriculum_start_job($1,$2::jsonb,$3::jsonb,1,0.1,$4::jsonb,true) id',[source,JSON.stringify(bundle.manifest),JSON.stringify(specs),JSON.stringify(cfg)]))[0].id
  const jid=await start();assert.equal(await start(),jid)
  await q("update curriculum_jobs set status='paused' where id=$1",[jid])
  assert.equal((await q('select curriculum_claim($1) result',[jid]))[0].result,null)
  await q("update curriculum_jobs set status='queued' where id=$1",[jid])
  const claim=(await q('select curriculum_claim($1) result',[jid]))[0].result;assert.ok(claim)
  assert.equal((await q('select curriculum_claim($1) result',[jid]))[0].result,null)
  await q("select curriculum_finish($1,$2,null,'Provider HTTP401',false,0)",[claim.item_id,claim.claim_token])
  await q('select curriculum_claim($1)',[jid])
  const job=(await q('select * from curriculum_jobs where id=$1',[jid]))[0]
  assert.equal(job.status,'budget_exhausted');assert.equal(job.requests,1);assert.equal(Number(job.reserved_cost_usd),0.1)
  await assert.rejects(()=>q("select curriculum_finish($1,$2,null,'stale',true,0)",[claim.item_id,claim.claim_token]),/Stale/)
 })

 await t.test('challenge edits retain hidden bug IDs and removed bugs become inactive',async()=>{
  await actor(ADMIN)
  const lesson=(await q("select * from lessons where slug='bva-and-ep'"))[0]
  const cid=(await q("insert into challenges(slug,module_id,learning_path_id,is_active,is_required,practical_app_key,practical_app_config) values('fixture-login',$1,$2,false,true,'login_form','{}') returning id",[lesson.module_id,lesson.learning_path_id]))[0].id
  const bugs=[{bug_key:'invalid_email_validation_missing',bug_title:'Missing email validation',description:'Controlled fixture',actual_severity:'Medium',bonus_xp:25,is_active:true}]
  await q('select curriculum_sync_bugs($1,$2::jsonb)',[cid,JSON.stringify(bugs)])
  const original=(await q('select id from hidden_bugs where challenge_id=$1',[cid]))[0].id
  await q('select curriculum_sync_bugs($1,$2::jsonb)',[cid,JSON.stringify([{...bugs[0],bonus_xp:30}])])
  assert.equal((await q('select id from hidden_bugs where challenge_id=$1',[cid]))[0].id,original)
  await q("select curriculum_sync_bugs($1,'[]')",[cid])
  assert.equal((await q('select is_active from hidden_bugs where id=$1',[original]))[0].is_active,false)
  await actor(TESTER);assert.equal((await q('select * from hidden_bugs')).length,0)
 })
 await t.test('master backup restores UUIDs, bilingual content, activities and challenge links into empty isolated test DB',async()=>{
  await actor(ADMIN)
  const bid=(await q('select curriculum_backup() id'))[0].id
  const payload=(await q('select payload from curriculum_backups where id=$1',[bid]))[0].payload
  const restored=new PGlite()
  try{
   await restored.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
   for(const m of ['020_practical_challenge_security.sql','021_curriculum_factory.sql','022_curriculum_jobs.sql','023_practical_lab_sessions.sql','024_curriculum_backup_and_bug_history.sql'])
    await restored.exec(fs.readFileSync('supabase/migrations/'+m,'utf8').replace(/^\uFEFF/,''))
   await restored.exec("set role authenticated;set request.jwt.claim.sub='"+ADMIN+"'")
   const restore=()=>restored.query('select curriculum_restore_test_backup($1::jsonb,$2) result',[JSON.stringify(payload),'RESTORE_EMPTY_TEST_DATABASE'])
   await assert.rejects(()=>restore(),/not enabled/)
   await restored.exec("set testcraft.allow_restore='on'")
   const result=(await restore()).rows[0].result
   assert.equal(result.lessons,9);assert.equal(result.published,0)
   const original=await q('select id,title_ar,content_ar from lessons order by id')
   assert.deepEqual((await restored.query('select id,title_ar,content_ar from lessons order by id')).rows,original)
   const a=await q('select id,body,lesson_id,module_id from lesson_activities order by id')
   assert.deepEqual((await restored.query('select id,body,lesson_id,module_id from lesson_activities order by id')).rows,a)
   assert.equal((await restored.query('select count(*)::int n from challenges')).rows[0].n,1)
   await assert.rejects(()=>restore(),/empty curriculum/)
  }finally{await restored.close()}
 })
 }finally{await db.close()}
})

