require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const bundle=JSON.parse(fs.readFileSync('content/pilot-bundle.json','utf8'))
const {flattenManifest}=require('../src/lib/curriculum/curriculum-manifest.schema.ts')
const {initialState,simulate}=require('../src/lib/practical-challenges/simulator.ts')
const ADMIN='00000000-0000-4000-8000-000000000001',TESTER='00000000-0000-4000-8000-000000000002',OTHER='00000000-0000-4000-8000-000000000003'

test('deterministic release flow: import, generate, review, publish, learn, lab report, award once, archive safely',async()=>{
 const {PGlite}=await import('@electric-sql/pglite')
 const db=new PGlite(),q=async(sql,args=[]) => (await db.query(sql,args)).rows
 const actor=async(id,role='authenticated')=>db.exec("reset role;set role "+role+";set request.jwt.claim.sub='"+id+"'")
 const rpc=async(name,args={})=>{
  const keys=Object.keys(args),values=Object.values(args),params=keys.map((key,index)=>key+'=> $'+(index+1)).join(',')
  return (await q('select public.'+name+'('+params+') result',values))[0].result
 }
 try{
  await db.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
  const migrations=fs.readdirSync('supabase/migrations').filter(name=>Number(name.slice(0,3))>=20).sort()
  for(const migration of migrations)await db.exec(fs.readFileSync(path.join('supabase/migrations',migration),'utf8').replace(/^\uFEFF/,''))
  await actor(ADMIN)
  const imported=(await q('select curriculum_import($1::jsonb,$2,$3::jsonb,$4::jsonb) result',[
   JSON.stringify(bundle.manifest),'release-flow',JSON.stringify(bundle.lessons),JSON.stringify(bundle.module_assessments)
  ]))[0].result
  assert.equal(imported.inserted_lessons,9)
  const specs=flattenManifest(bundle.manifest).filter(item=>item.module_slug==='intro-to-qa').slice(0,2)
  const source=(await q("select id from curriculum_sources where fingerprint='release-flow'"))[0].id
  const config={model:'deterministic-release-fixture',request_ceiling_usd:0.1}
  const start=async()=>rpc('curriculum_start_job',{p_source:source,p_manifest:JSON.stringify(bundle.manifest),p_specs:JSON.stringify(specs),p_requests:2,p_cost:0.2,p_config:JSON.stringify(config),p_regenerate:true})
  const job=await start();assert.equal(await start(),job,'repeated start click reuses the active job')
  const finish=async()=>{
   const claim=await rpc('curriculum_claim',{p_job:job});assert.ok(claim)
   const original=bundle.lessons.find(item=>item.key===claim.spec.key)
   const lesson={...original,summary_en:original.summary_en+' A deterministic review note was added.',summary_ar:original.summary_ar+' أضيفت ملاحظة مراجعة محكومة.'}
   await rpc('curriculum_finish',{p_item:claim.item_id,p_token:claim.claim_token,p_output:JSON.stringify({lesson,module_assessment:[]}),p_error:null,p_retry:true,p_actual_cost:0})
   return claim
  }
  const firstClaim=await finish()
  await q("update curriculum_jobs set status='paused' where id=$1",[job])
  assert.equal(await rpc('curriculum_claim',{p_job:job}),null,'pause stops the next claim')
  await q("update curriculum_jobs set status='queued' where id=$1",[job])
  const secondClaim=await finish();assert.notEqual(secondClaim.item_id,firstClaim.item_id)
  assert.equal(await rpc('curriculum_claim',{p_job:job}),null)
  assert.equal((await q('select status from curriculum_jobs where id=$1',[job]))[0].status,'needs_review')
  assert.equal((await q("select count(*)::int n from curriculum_job_items where job_id=$1 and status='completed'",[job]))[0].n,2)

  const lesson=(await q("select * from lessons where slug='software-testing-fundamentals'"))[0]
  const module=(await q('select * from learning_modules where id=$1',[lesson.module_id]))[0]
  const challenge=(await q("insert into challenges(slug,module_id,lesson_id,learning_path_id,is_active,is_required,practical_app_key,practical_app_config,status,base_xp_reward) values('release-flow-login',$1,$2,$3,false,true,'login_form','{}','draft',150) returning id",[module.id,lesson.id,lesson.learning_path_id]))[0]
  const bug={bug_key:'invalid_email_validation_missing',bug_title:'Malformed email reaches credential handling',description:'Controlled login validation defect',actual_severity:'Medium',bonus_xp:25,is_active:true}
  await rpc('curriculum_sync_bugs',{p_challenge:challenge.id,p_bugs:JSON.stringify([bug])})
  const preset=(await q('select id,bug_key from hidden_bugs where challenge_id=$1',[challenge.id]))[0]
  assert.ok(preset,'admin can inspect the private controlled defect preset')

  const generated=(await q('select * from curriculum_versions where lesson_id=$1 and status=\'needs_review\' order by created_at desc limit 1',[lesson.id]))[0]
  assert.ok(generated,'generated output is staged for review')
  await rpc('curriculum_approve_version',{p_version:generated.id})
  await rpc('curriculum_apply_version',{p_version:generated.id,p_expected_updated:generated.base_updated_at})
  const moduleLessons=await q("select id from lessons where module_id=$1 order by sort_order",[module.id])
  for(const row of moduleLessons)await rpc('curriculum_publish',{p_lesson:row.id,p_acknowledged:true})
  await q("update challenges set is_active=true,status='published' where id=$1",[challenge.id])

  await actor(TESTER)
  assert.equal((await rpc('curriculum_can_read_lesson',{p_lesson:lesson.id})),true)
  assert.equal((await rpc('curriculum_can_enter_lab',{p_challenge:challenge.id})),false,'all lessons in the module are a prerequisite')
  const activities=await rpc('curriculum_get_activities',{p_lesson:lesson.id})
  assert.ok(activities.length>=1)
  assert.doesNotMatch(JSON.stringify(activities),/"answer"|"rubric"|"explanation"/)
  const objective=activities.find(item=>item.kind==='scenario')
  const answer=bundle.lessons[0].activities.find(item=>item.slug==='delivery-cutoff').answer
  const graded=await rpc('curriculum_submit_activity',{p_activity:objective.id,p_request:'20000000-0000-4000-8000-000000000001',p_selected:JSON.stringify(answer),p_text:''})
  assert.equal(graded.status,'graded');assert.equal(graded.score,1)
  for(const row of moduleLessons){
   assert.equal(await rpc('curriculum_can_read_lesson',{p_lesson:row.id}),true)
   await q('insert into lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now()) on conflict do nothing',[TESTER,row.id])
   assert.equal((await rpc('curriculum_award_lesson',{p_lesson:row.id})).totalXpAwarded,10)
  }
  assert.equal((await rpc('curriculum_can_enter_lab',{p_challenge:challenge.id})),true)

  assert.equal((await q('select * from hidden_bugs')).length,0,'tester cannot read private bug definitions')
  const defaultBehavior=simulate(initialState('login_form'),{type:'login',data:{email:'malformed',password:'Goodpass1'}},[],{},1000)
  assert.ok(defaultBehavior.errors.email)
  const defect=simulate(initialState('login_form'),{type:'login',data:{email:'malformed',password:'Goodpass1'}},[preset.bug_key],{},1000)
  assert.equal(defect.view.submitted,1);assert.match(defect.message.en,/Invalid credentials/)
  assert.doesNotMatch(JSON.stringify({view:defect.view,message:defect.message,errors:defect.errors}),/invalid_email_validation_missing|private_bugs|activeBugs/)

  const attempt=(await q("insert into challenge_attempts(user_id,challenge_id,status,is_passed) values($1,$2,'started',false) returning id",[TESTER,challenge.id]))[0].id
  await q("update challenge_attempts set status='submitted' where id=$1",[attempt])
  const report=(await q('insert into bug_reports(user_id,challenge_id,attempt_id,title,steps_to_reproduce,expected_result,actual_result,reported_severity,request_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id',[
   TESTER,challenge.id,attempt,'Malformed email is processed','Reset; enter malformed and valid-length password; submit.','Show email-format validation.','Credential error shown after processing.','Medium','30000000-0000-4000-8000-000000000001'
  ]))[0].id
  await actor(ADMIN)
  await q("update bug_reports set status='Reviewed',admin_classification='valid_bug',matched_hidden_bug_id=$1,admin_feedback='Reproduced against the requirement.' where id=$2",[preset.id,report])
  await q("update challenge_attempts set status='approved',is_passed=true,admin_feedback='Accepted after evidence review.',reviewed_by=$1,reviewed_at=now() where id=$2",[ADMIN,attempt])
  const award=await rpc('curriculum_award_challenge',{p_attempt:attempt,p_found:[preset.id]})
  assert.equal(award.totalXpAwarded,200)
  assert.equal((await rpc('curriculum_award_challenge',{p_attempt:attempt,p_found:[preset.id]})).totalXpAwarded,0)
  const xpBefore=(await q('select total_xp from profiles where id=$1',[TESTER]))[0].total_xp
  assert.equal(xpBefore,230)

  await rpc('curriculum_sync_bugs',{p_challenge:challenge.id,p_bugs:JSON.stringify([{...bug,bug_title:'Edited title'}])})
  await actor(ADMIN,'postgres')
  await q("update challenges set is_active=false,status='archived' where id=$1",[challenge.id])
  assert.equal((await q('select count(*)::int n from challenge_attempts where id=$1',[attempt]))[0].n,1)
  assert.equal((await q('select count(*)::int n from bug_reports where id=$1 and matched_hidden_bug_id=$2',[report,preset.id]))[0].n,1)
  assert.equal((await q('select total_xp from profiles where id=$1',[TESTER]))[0].total_xp,xpBefore)
  assert.equal((await q('select id from hidden_bugs where id=$1',[preset.id])).length,1)
  await actor(OTHER)
  await assert.rejects(()=>q('select * from bug_reports where id=$1',[report]),/permission denied|row-level security/)
  assert.equal((await q('select * from challenge_attempts where id=$1',[attempt])).length,0)
 }finally{await db.close()}
})
