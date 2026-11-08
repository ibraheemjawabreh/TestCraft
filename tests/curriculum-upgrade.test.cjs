require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const {PGlite}=require('@electric-sql/pglite')
const {curriculumImportSchema}=require('../src/lib/curriculum/import-schema.ts')
const ADMIN='00000000-0000-4000-8000-000000000001',USER='00000000-0000-4000-8000-000000000002'
const upgrade=fs.readFileSync('supabase/migrations/034_simple_curriculum.sql','utf8')
const bundle=JSON.parse(fs.readFileSync('content/pilot-bundle.json','utf8'))
const example=JSON.parse(fs.readFileSync('tests/fixtures/curriculum-import.json','utf8'))
const migrationSQL=name=>fs.readFileSync('supabase/migrations/'+name,'utf8').replace(/^\uFEFF/,'')

test('034 upgrades a real pre-031 schema, resumes a partial attempt, and safely reruns with user history intact',async()=>{
 const pg=new PGlite({initialMemory:128*1024*1024})
 const q=async(sql,args=[])=>(await pg.query(sql,args)).rows
 const actor=id=>pg.exec("reset role;set role authenticated;set request.jwt.claim.sub='"+id+"'")
 try{
  await pg.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
  for(const name of fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20&&Number(n.slice(0,3))<=30).sort())await pg.exec(migrationSQL(name))
  assert.equal((await q("select to_regclass('public.lesson_prerequisites') id"))[0].id,null)
  await actor(ADMIN)
  await q('select curriculum_import($1::jsonb,$2,$3::jsonb,$4::jsonb)',[JSON.stringify(bundle.manifest),'pre-031-upgrade-fixture',JSON.stringify(bundle.lessons),JSON.stringify(bundle.module_assessments)])
  const lessons=await q('select id,module_id from lessons order by sort_order,slug')
  const first=(await q('select * from lessons where slug=$1',[bundle.manifest.paths[0].modules[0].lessons[0].lesson_slug]))[0]
  const second=(await q('select id from lessons where slug=$1',[bundle.manifest.paths[0].modules[0].lessons[1].lesson_slug]))[0]
  await q('select curriculum_publish($1,true)',[first.id])
  const objective=(await q("select id,body from lesson_activities where lesson_id=$1 and body->>'kind'='scenario'",[first.id]))[0]
  await actor(USER)
  await q('insert into lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now())',[USER,first.id])
  await q('select curriculum_award_lesson($1)',[first.id])
  const attempt=(await q("select curriculum_submit_activity($1,$2,$3::jsonb,'') result",[objective.id,'20000000-0000-4000-8000-000000000001',JSON.stringify(objective.body.answer)]))[0].result
  await pg.exec('reset role')
  // Model a previous SQL Editor attempt that added one column independently.
  await pg.exec('alter table public.lessons add column archived_at timestamptz')
  const protectedTables=['profiles','learning_paths','learning_modules','lessons','lesson_progress','module_progress','learning_path_progress','challenges','hidden_bugs','challenge_attempts','lesson_activities','activity_attempts','curriculum_backups','curriculum_sources','curriculum_versions','xp_transactions','user_badges']
  const snapshot=async()=>Object.fromEntries(await Promise.all(protectedTables.map(async table=>[table,(await q("select coalesce(jsonb_agg(body order by body::text),'[]') rows from (select to_jsonb(t)-'created_at'-'archived_at'"+(table==='learning_modules'?"-'updated_at'":'')+" body from public."+table+" t) records"))[0].rows])))
  const before=await snapshot()
  await pg.exec(upgrade)
  assert.deepEqual(await snapshot(),before,'Upgrade must retain all existing curriculum and user records')
  assert.equal((await q("select to_regclass('public.lesson_prerequisites') id"))[0].id,'lesson_prerequisites')
  assert.equal((await q('select count(*)::int n from lesson_prerequisites'))[0].n,0)
  await pg.exec(upgrade)
  assert.deepEqual(await snapshot(),before,'Reapplying the complete SQL file must not modify content, progress, XP, or attempts')

  await actor(ADMIN)
  const doc=curriculumImportSchema.parse(example)
  const revision=(await q('select curriculum_export_json() result'))[0].result.revision
  const start=(await q('select curriculum_prepare_json($1::jsonb,$2,$3) result',[JSON.stringify(doc),revision,'recovery-import']))[0].result
  const imported=(await q('select curriculum_import_json_batch($1,0,25) result',[start.source_id]))[0].result
  assert.equal(imported.inserted_lessons,0);assert.equal(imported.kept_existing,2)
  assert.equal((await q('select count(*)::int n from lessons'))[0].n,lessons.length)

  // The repaired table must carry the 031 access rules, not merely stop DDL errors.
  await q('insert into lesson_prerequisites values($1,$2)',[first.id,second.id])
  await actor(USER)
  assert.equal((await q('select curriculum_can_read_lesson($1) allowed',[first.id]))[0].allowed,false)
  await assert.rejects(()=>q('select curriculum_get_activities($1)',[first.id]),/unavailable/)
  await assert.rejects(()=>q("select curriculum_submit_activity($1,$2,$3::jsonb,'')",[objective.id,'20000000-0000-4000-8000-000000000002',JSON.stringify(objective.body.answer)]),/unavailable/)
  await assert.rejects(()=>q('select curriculum_award_lesson($1)',[first.id]),/accessible/)
  assert.equal((await q('select count(*)::int n from lesson_prerequisites'))[0].n,0,'Prerequisite links remain admin-only')
  await actor(ADMIN)
  const backupId=(await q('select curriculum_backup() id'))[0].id
  const backup=(await q('select payload from curriculum_backups where id=$1',[backupId]))[0].payload
  assert.equal(backup.prerequisites.length,1)
  assert.equal(backup.prerequisites[0].lesson_id,first.id)
  await pg.exec('reset role')
  await pg.exec(upgrade)
  assert.equal((await q('select count(*)::int n from lesson_prerequisites'))[0].n,1,'Rerun must preserve existing prerequisite links')
  assert.equal((await q('select id from activity_attempts where id=$1',[attempt.id]))[0].id,attempt.id)
  assert.equal((await q('select total_xp from profiles where id=$1',[USER]))[0].total_xp,10)
  assert.equal((await q('select id from lessons where id=$1',[first.id]))[0].id,first.id)
 }finally{await pg.close()}
})

test('034 reports incomplete base dependencies before any schema changes and rolls back cleanly',async()=>{
 const pg=new PGlite({initialMemory:128*1024*1024})
 try{
  await pg.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
  await assert.rejects(()=>pg.exec(upgrade),e=>e.code==='42P01'&&e.message.includes('curriculum_sources')&&e.message.includes('lesson_activities'))
  await pg.exec('rollback')
  const state=(await pg.query("select to_regclass('public.lesson_prerequisites') prerequisites,(select count(*)::int from information_schema.columns where table_schema='public' and column_name='archived_at') archives")).rows[0]
  assert.equal(state.prerequisites,null);assert.equal(state.archives,0)
 }finally{await pg.close()}
})

test('035 lets trusted lesson reward RPCs pass the legacy profile guard while blocking client XP and role changes',async()=>{
 const pg=new PGlite({initialMemory:128*1024*1024})
 const q=async(sql,args=[])=>(await pg.query(sql,args)).rows
 const actor=id=>pg.exec("reset role;set role authenticated;set request.jwt.claim.sub='"+id+"'")
 try{
  await pg.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
  await pg.exec('alter table profiles add column created_at timestamptz not null default now()')
  for(const name of fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20&&Number(n.slice(0,3))<=30).sort())await pg.exec(migrationSQL(name))
  await pg.exec(upgrade)
  await actor(ADMIN)
  await q('select curriculum_import($1::jsonb,$2,$3::jsonb,$4::jsonb)',[JSON.stringify(bundle.manifest),'legacy-reward-guard-fixture',JSON.stringify(bundle.lessons),JSON.stringify(bundle.module_assessments)])
  const lesson=(await q('select id from lessons where slug=$1',[bundle.manifest.paths[0].modules[0].lessons[0].lesson_slug]))[0].id
  await q('select curriculum_publish($1,true)',[lesson])
  await actor(USER)
  await q('insert into lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now())',[USER,lesson])
  await pg.exec(`reset role;
   create function public.prevent_profile_privilege_escalation() returns trigger language plpgsql security definer set search_path=public as $$
   begin
    if auth.uid() is not null and not public.is_admin() then
     if new.role is distinct from old.role then raise exception 'You are not allowed to change your role.'; end if;
     if new.total_xp is distinct from old.total_xp then raise exception 'You are not allowed to change your XP.'; end if;
     if new.current_level is distinct from old.current_level then raise exception 'You are not allowed to change your level.'; end if;
     if new.id is distinct from old.id then raise exception 'You are not allowed to change your user id.'; end if;
     if new.created_at is distinct from old.created_at then raise exception 'You are not allowed to change created_at.'; end if;
    end if;return new;
   end $$;
   create trigger prevent_profile_privilege_escalation_trigger before update on profiles for each row execute function public.prevent_profile_privilege_escalation();`)
  await actor(USER)
  await assert.rejects(()=>q('select curriculum_award_lesson($1)',[lesson]),/change your XP/)
  await pg.exec('reset role')
  const before=await q('select * from profiles order by id')
  const fix=migrationSQL('035_legacy_profile_reward_guard.sql')
  await pg.exec(fix);await pg.exec(fix)
  assert.deepEqual(await q('select * from profiles order by id'),before)
  assert.equal((await q("select prosecdef from pg_proc where oid='prevent_profile_privilege_escalation()'::regprocedure"))[0].prosecdef,false)
  await actor(USER)
  await assert.rejects(()=>q('update profiles set total_xp=total_xp+100 where id=$1',[USER]),/server-managed/)
  await assert.rejects(()=>q("update profiles set role='admin' where id=$1",[USER]),/change your role/)
  await assert.rejects(()=>q("update profiles set created_at=created_at-interval '1 day' where id=$1",[USER]),/change created_at/)
  const award=(await q('select curriculum_award_lesson($1) result',[lesson]))[0].result
  const retry=(await q('select curriculum_award_lesson($1) result',[lesson]))[0].result
  assert.equal(award.totalXpAwarded,10);assert.equal(retry.totalXpAwarded,0)
  assert.equal((await q('select total_xp from profiles where id=$1',[USER]))[0].total_xp,10)
 }finally{await pg.close()}
})
