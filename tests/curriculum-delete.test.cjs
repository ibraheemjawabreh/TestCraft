require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module')
const {PGlite}=require('@electric-sql/pglite')
const ADMIN='00000000-0000-4000-8000-000000000001',USER='00000000-0000-4000-8000-000000000002'
const migration=fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_curriculum_delete_subtree.sql'))
assert.ok(migration,'The curriculum deletion migration must exist')
const doc=JSON.parse(fs.readFileSync('tests/fixtures/curriculum-import.json','utf8'))

test('confirmed curriculum deletion is scoped, atomic, backed up and admin-only',async t=>{
 const pg=new PGlite({initialMemory:128*1024*1024}),q=async(sql,args=[])=>(await pg.query(sql,args)).rows
 let uid=ADMIN,guest=false
 const actor=async id=>{uid=id;await pg.exec("reset role;set role authenticated;set request.jwt.claim.sub='"+id+"'")}
 const db={auth:{getUser:async()=>({data:{user:guest?null:{id:uid}},error:null})},
  async rpc(name,args={}){try{return{data:(await q('select public.'+name+'('+Object.keys(args).map((k,i)=>k+'=> $'+(i+1)).join(',')+') result',Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v)))[0].result,error:null}}catch(e){return{data:null,error:{message:e.message,code:e.code}}}},
  from(table){const filters={};const query={select(){return query},eq(k,v){filters[k]=v;return query},async single(){try{const keys=Object.keys(filters);return{data:(await q('select * from '+table+' where '+keys.map((k,i)=>k+'=$'+(i+1)).join(' and '),Object.values(filters)))[0],error:null}}catch(e){return{data:null,error:{message:e.message}}}}};return query}}
 const load=Module._load
 Module._load=function(name,parent,...rest){if(name==='@/lib/supabase/server')return{createClient:async()=>db};return load.call(this,name,parent,...rest)}
 try{
  await pg.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
  await pg.exec(fs.readFileSync('tests/fixtures/curriculum-deletion-progress.sql','utf8'))
  for(const name of fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20&&n!==migration).sort())await pg.exec(fs.readFileSync('supabase/migrations/'+name,'utf8').replace(/^\uFEFF/,''))
  await actor(ADMIN)
  async function importDoc(document,fingerprint){
   const revision=(await q('select curriculum_export_json() result'))[0].result.revision
   const start=(await q('select curriculum_prepare_json($1::jsonb,$2,$3) result',[JSON.stringify(document),revision,fingerprint]))[0].result
   return(await q('select curriculum_import_json_batch($1,0,25) result',[start.source_id]))[0].result
  }
  // Normalize the same public import contract used by the actual endpoint.
  const {curriculumImportSchema}=require('../src/lib/curriculum/import-schema.ts')
  const normalized=curriculumImportSchema.parse(doc)
  await importDoc(normalized,'delete-fixture')
  const outside=structuredClone(normalized);outside.paths[0].slug='unrelated-path';await importDoc(outside,'outside-delete-fixture')
  const paths=await q('select id,slug from learning_paths order by slug')
  const path=paths.find(p=>p.slug===doc.paths[0].slug),otherPath=paths.find(p=>p.slug==='unrelated-path')
  const lessons=await q('select l.* from lessons l join learning_modules m on m.id=l.module_id where l.learning_path_id=$1 order by m.sort_order',[path.id])
  const other=(await q('select * from lessons where learning_path_id=$1 order by sort_order,slug',[otherPath.id]))[0]
  const first=lessons[0]
  for(const l of [...lessons,other])await q('select curriculum_publish($1,true)',[l.id])
  const activity=(await q("select id,body from lesson_activities where lesson_id=$1 and body->>'kind'='scenario'",[first.id]))[0]
  await actor(USER)
  await q('insert into lesson_progress(user_id,lesson_id,completed_at) values($1,$2,now()),($1,$3,now())',[USER,first.id,other.id])
  await q('select curriculum_award_lesson($1)',[first.id])
  await q("select curriculum_submit_activity($1,$2,$3::jsonb,'')",[activity.id,'20000000-0000-4000-8000-000000000001',JSON.stringify(activity.body.answer)])
  await pg.exec('reset role')
  const challenge=(await q("insert into challenges(slug,learning_path_id,module_id,lesson_id,is_active,is_required,status) values('keep-challenge',$1,$2,$3,true,false,'published') returning id",[path.id,first.module_id,first.id]))[0].id
  await q("insert into hidden_bugs(challenge_id,bug_key,is_active,description,bug_title,actual_severity,bonus_xp) values($1,'kept',true,'Private fixture','Kept','Medium',10)",[challenge])
  const attempt=(await q("insert into challenge_attempts(user_id,challenge_id,status,is_passed) values($1,$2,'approved',true) returning id",[USER,challenge]))[0].id
  await q("insert into bug_reports(user_id,challenge_id,attempt_id,title,status) values($1,$2,$3,'Retained report','Reviewed')",[USER,challenge,attempt])
  await q("insert into module_progress(user_id,module_id,status,total_lessons,completed_lessons,completion_percentage,completed_at) values($1,$2,'completed',1,1,100,now()),($1,$3,'completed',1,1,100,now())",[USER,first.module_id,other.module_id])
  await q('insert into learning_path_progress(user_id,learning_path_id,completed_modules,completed_lessons,completion_percentage,current_module_id,current_lesson_id,current_challenge_id) values($1,$2,1,1,50,$3,$4,$5),($1,$6,1,1,50,$7,$8,null)',[USER,path.id,first.module_id,first.id,challenge,otherPath.id,other.module_id,other.id])
  await q("insert into curriculum_versions(lesson_id,fingerprint,body,base_updated_at,created_by) select id,'kept-history','{}',updated_at,$2 from lessons where id=$1",[first.id,ADMIN])
  await q('insert into lesson_prerequisites(lesson_id,prerequisite_id) values($1,$2)',[other.id,first.id])
  const tables=(await q("select tablename from pg_tables where schemaname='public' order by tablename")).map(t=>t.tablename)
  const snapshot=async()=>{await pg.exec('reset role');try{const data={};for(const name of tables)data[name]=(await q("select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') rows from public."+name+' t'))[0].rows;return data}finally{await actor(uid)}}
  const beforeInstall=await snapshot()
  await pg.exec('reset role');await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));await pg.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));await actor(ADMIN)
  assert.deepEqual(await snapshot(),beforeInstall,'Installing/rerunning the feature must change no existing rows')
  for(const name of ['../src/lib/auth/api-auth.ts','../src/lib/curriculum/import-service.ts'])delete require.cache[require.resolve(name)]
  const route=require('../src/app/api/admin/curriculum/delete/route.ts'),downloads=require('../src/app/api/admin/curriculum/download/route.ts')
  const get=(kind,id)=>route.GET(new Request('http://localhost/api/admin/curriculum/delete?kind='+kind+'&id='+id))
  const preview=async(kind,id)=>{const r=await get(kind,id),j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j.data}
  const post=(p,confirmation=p.slug,revision=p.revision,origin)=>route.POST(new Request('http://localhost/api/admin/curriculum/delete',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify({kind:p.kind,id:p.id,confirmation,revision})}))

  await t.test('preview reads exact descendant counts and neither creates a backup nor modifies data',async()=>{
   const before=await snapshot(),p=await preview('path',path.id)
   assert.equal(p.counts.paths,1);assert.equal(p.counts.modules,2);assert.equal(p.counts.lessons,2)
   assert.equal(p.counts.activity_attempts,1);assert.equal(p.counts.linked_challenges,1)
   assert.deepEqual(await snapshot(),before)
  })
  await t.test('API and RPC reject guests, learners, wrong confirmations, stale previews and cross-origin deletes',async()=>{
   const before=await snapshot(),p=await preview('path',path.id)
   guest=true;assert.equal((await get('path',path.id)).status,401);assert.equal((await post(p)).status,401);guest=false
   await actor(USER);assert.equal((await post(p)).status,403)
   await assert.rejects(()=>q('select curriculum_delete_subtree($1,$2,$3,$4)',['path',path.id,p.slug,p.revision]),e=>e.code==='42501')
   await actor(ADMIN)
   assert.equal((await post(p,'wrong')).status,400);assert.equal((await post(p,p.slug,'0'.repeat(32))).status,409)
   assert.equal((await post(p,p.slug,p.revision,'https://foreign.example')).status,403)
   assert.equal((await get('everything',path.id)).status,400)
   assert.deepEqual(await snapshot(),before)
  })
  await t.test('backup failure and a late delete failure both roll back all rows, links and new backup records',async()=>{
   const before=await snapshot(),p=await preview('path',path.id)
   for(const [table,event] of [['curriculum_backups','insert'],['learning_paths','delete']]){
    await pg.exec(`reset role;create function fail_deletion_fixture() returns trigger language plpgsql as $$ begin raise exception 'Injected deletion failure';end $$;create trigger fail_deletion_fixture before ${event} on ${table} for each row execute function fail_deletion_fixture();`)
    await actor(ADMIN);assert.equal((await post(p)).status,400)
    assert.deepEqual(await snapshot(),before)
    await pg.exec(`reset role;drop trigger fail_deletion_fixture on ${table};drop function fail_deletion_fixture();`);await actor(ADMIN)
   }
  })
  for(const [kind,id] of [['lesson',first.id],['module',first.module_id],['path',path.id]])await t.test(kind+' deletion removes only its subtree, downloads a verified backup and permits fresh drafts',async()=>{
   const before=await snapshot();await pg.exec('begin');await actor(ADMIN)
   try{
    const p=await preview(kind,id),response=await post(p),result=await response.json();assert.equal(response.status,200,JSON.stringify(result))
    assert.ok(result.data.backup_id)
    assert.equal((await q('select count(*)::int n from lessons where id=$1',[first.id]))[0].n,0)
    assert.equal((await q('select count(*)::int n from lessons where id=$1',[other.id]))[0].n,1)
    const after=await snapshot()
    for(const table of ['profiles','xp_transactions','user_badges','hidden_bugs','challenge_attempts','bug_reports'])assert.deepEqual(after[table],before[table],table+' must be retained')
    const stripLinks=rows=>rows.map(({learning_path_id,module_id,lesson_id,...rest})=>rest)
    assert.deepEqual(stripLinks(after.challenges),stripLinks(before.challenges))
    assert.equal(after.challenges[0].lesson_id,null)
    if(kind!=='lesson')assert.equal(after.challenges[0].module_id,null)
    if(kind==='path')assert.equal(after.challenges[0].learning_path_id,null)
    assert.equal((await q('select count(*)::int n from activity_attempts where activity_id=$1',[activity.id]))[0].n,0)
    if(kind!=='path'){
     const parent=(await q('select * from learning_path_progress where learning_path_id=$1',[path.id]))[0]
     assert.equal(parent.completed_lessons,0);assert.equal(parent.current_lesson_id,null)
    }
    const saved=await downloads.GET(new Request('http://localhost/api/admin/curriculum/download?file=backup&id='+result.data.backup_id))
    assert.equal(saved.status,200);assert.match(saved.headers.get('content-disposition'),/attachment/)
    const backup=await saved.json()
    assert.equal(backup.deletion.id,id);assert.equal(backup.activity_attempts[0].activity_id,activity.id)
    assert.ok(backup.lessons.some(l=>l.id===first.id));assert.ok(backup.lesson_progress.some(l=>l.lesson_id===first.id))
    assert.ok(backup.versions.some(v=>v.lesson_id===first.id));assert.ok(backup.prerequisites.some(r=>r.prerequisite_id===first.id))
    assert.equal(backup.challenges.find(c=>c.id===challenge).lesson_id,first.id)
    if(kind==='path'){
     await pg.exec('savepoint deleted_state;reset role')
     for(const [table,key] of [['learning_paths','learning_paths'],['learning_modules','learning_modules'],['lessons','lessons'],['lesson_activities','activities'],['curriculum_versions','versions'],['lesson_prerequisites','prerequisites'],['lesson_progress','lesson_progress'],['module_progress','module_progress'],['learning_path_progress','learning_path_progress'],['activity_attempts','activity_attempts']]){
      await q('insert into public.'+table+' select * from jsonb_populate_recordset(null::public.'+table+',$1::jsonb) on conflict do nothing',[JSON.stringify(backup[key])])
     }
     await q('update challenges c set learning_path_id=s.learning_path_id,module_id=s.module_id,lesson_id=s.lesson_id from jsonb_populate_recordset(null::public.challenges,$1::jsonb) s where c.id=s.id',[JSON.stringify(backup.challenges)])
     const restored=await snapshot(),omitBackup=({curriculum_backups,...rest})=>rest
     assert.deepEqual(omitBackup(restored),omitBackup(before),'The saved backup must recover content, progress, attempts, versions, prerequisites and challenge links exactly')
     await pg.exec('rollback to savepoint deleted_state');await actor(ADMIN)
    }
    const imported=await importDoc(normalized,'reuse-after-delete-'+kind)
    assert.equal(imported.inserted_lessons,kind==='path'?2:1)
    const fresh=(await q('select * from lessons where learning_path_id in(select id from learning_paths where slug=$1) and slug=$2',[doc.paths[0].slug,first.slug]))[0]
    assert.notEqual(fresh.id,first.id);assert.equal(fresh.is_published,false)
   }finally{await pg.exec('rollback');await actor(ADMIN)}
   assert.deepEqual(await snapshot(),before)
  })
 }finally{Module._load=load;await pg.close()}
})
