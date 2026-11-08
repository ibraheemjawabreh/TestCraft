require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module')
const {curriculumImportSchema}=require('../src/lib/curriculum/import-schema.ts')
const example=JSON.parse(fs.readFileSync('tests/fixtures/curriculum-import.json','utf8'))
const downloadExample=JSON.parse(fs.readFileSync('public/curriculum/example.json','utf8'))
const ADMIN='00000000-0000-4000-8000-000000000001',USER='00000000-0000-4000-8000-000000000002'
const clone=v=>JSON.parse(JSON.stringify(v))

test('download example has one bilingual path, module and lesson and schema matches the actual importer',()=>{
 const {z}=require('zod')
 const {curriculumCounts}=require('../src/lib/curriculum/import-schema.ts')
 const document=curriculumImportSchema.parse(downloadExample)
 assert.deepEqual(curriculumCounts(document),{paths:1,modules:1,lessons:1})
 for(const entry of [document.paths[0],document.paths[0].modules[0],document.paths[0].modules[0].lessons[0]]){
  assert.match(entry.title_en,/[a-zA-Z]/);assert.match(entry.title_ar,/[\u0600-\u06ff]/)
 }
 const lesson=document.paths[0].modules[0].lessons[0]
 assert.match(lesson.content_en,/[a-zA-Z]/);assert.match(lesson.content_ar,/[\u0600-\u06ff]/)
 const {title,description,...schema}=JSON.parse(fs.readFileSync('public/curriculum/schema.json','utf8'))
 assert.deepEqual(schema,z.toJSONSchema(curriculumImportSchema,{io:'input',unrepresentable:'any'}))
})

test('nested curriculum validation rejects incomplete files, ambiguous order and duplicate path-scoped lesson slugs',()=>{
 const doc=curriculumImportSchema.parse(example)
 assert.equal(doc.paths[0].modules[1].sort_order,1)
 for(const mutate of [
  d=>d.paths[0].modules[1].lessons[0].content_ar='',
  d=>d.paths[0].modules[1].lessons[0].slug=d.paths[0].modules[0].lessons[0].slug,
  d=>{d.paths[0].modules[0].sort_order=5;d.paths[0].modules[1].sort_order=2},
  d=>d.paths[0].modules[0].lessons[0].practice[0].answer=['unknown-option'],
 ]){const bad=clone(example);mutate(bad);assert.equal(curriculumImportSchema.safeParse(bad).success,false)}
})

test('real import HTTP handlers and PostgreSQL RPCs: batches, safe re-import, publication, navigation, history and export',async t=>{
 const {PGlite}=require('@electric-sql/pglite'),pg=new PGlite({initialMemory:128*1024*1024})
 const q=async(sql,args=[])=>(await pg.query(sql,args)).rows
 const actor=async(id)=>pg.exec("reset role;set role authenticated;set request.jwt.claim.sub='"+id+"'")
 await pg.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
 for(const name of fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20).sort())await pg.exec(fs.readFileSync('supabase/migrations/'+name,'utf8').replace(/^\uFEFF/,''))
 // Production progress columns, uniqueness and ownership policies used by ProgressService.
 await pg.exec(`alter table lesson_progress add column status text default 'not_started';
 alter table lesson_progress add column started_at timestamptz default now();
 alter table module_progress add column status text,add column completion_percentage integer,add column completed_lessons integer,add column total_lessons integer,add column completed_at timestamptz;
 create unique index import_module_progress on module_progress(user_id,module_id);
 alter table learning_path_progress add column completion_percentage integer,add column completed_modules integer,add column completed_lessons integer,add column completed_challenges integer,add column current_module_id uuid,add column current_lesson_id uuid,add column last_activity_at timestamptz;
 create unique index import_path_progress on learning_path_progress(user_id,learning_path_id);
 grant select,insert,update on module_progress,learning_path_progress to authenticated;
 alter table lesson_progress enable row level security;
 create policy import_progress_owner on lesson_progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 alter table learning_paths add constraint import_path_bilingual check(not is_active or (length(title_en)>0 and length(title_ar)>0 and length(description_en)>0 and length(description_ar)>0));
 alter table lessons add constraint import_lesson_bilingual check(not is_published or (length(content_en)>0 and length(content_ar)>0));`)
 let uid=ADMIN,role='admin',guest=false
 const db={auth:{getUser:async()=>({data:{user:guest?null:{id:uid}},error:null})},
  async rpc(name,args={}){try{const values=Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v),params=Object.keys(args).map((k,i)=>k+'=> $'+(i+1)).join(',');return{data:(await q('select public.'+name+'('+params+') result',values))[0].result,error:null}}catch(e){return{data:null,error:{message:e.message,code:e.code}}}},
  from(table){const filters={};let patch=null,conflict=null,ignore=false,head=false
   const query={select(_columns,options){head=!!options?.head;return query},limit(){return query},order(){return query},not(){return query},eq(k,v){filters[k]=v;return query},in(k,v){filters[k]=v;return query},
    upsert(v,o){patch=v;conflict=o.onConflict;ignore=o.ignoreDuplicates;return query},update(v){patch=v;return query},
    single:async()=>{const r=await query;return{data:r.data?.[0]??null,error:r.error}},maybeSingle:async()=>query.single(),
    then(resolve,reject){return(async()=>{try{
     if(table==='profiles')return{data:[{role}],error:null}
     const scopeFK={module_progress:{learning_modules:'module_id'},lesson_progress:{lessons:'lesson_id'},
      challenges:{learning_modules:'module_id'},lessons:{learning_modules:'module_id'},challenge_attempts:{challenges:'challenge_id'}}
     const column=k=>{
      if(!k.includes('.'))return k
      const chain=k.split('.'),field=chain.pop()
      const follow=(parent,alias,index)=>{
       if(index===chain.length)return alias+'.'+field
       const relation=chain[index],fk=scopeFK[parent]?.[relation],next='related'+index
       if(!fk)throw Error('Unsupported fixture filter '+k)
       return '(select '+follow(relation,next,index+1)+' from '+relation+' '+next+' where '+next+'.id='+alias+'.'+fk+')'
      }
      return follow(table,table,0)
     }
     // This import fixture seeds no attempts for embedded challenge selections.
     // The production-browser fixture exercises both embedded attempt filters.
     const keys=Object.keys(filters).filter(k=>!['latest','passed'].includes(k.split('.')[0])),params=keys.map((k,i)=>Array.isArray(filters[k])?column(k)+'=any($'+(i+1)+')':column(k)+'=$'+(i+1)).join(' and '),vals=keys.map(k=>filters[k])
     if(patch){const ks=Object.keys(patch),vs=Object.values(patch);if(conflict)await q('insert into '+table+'('+ks.join(',')+') values('+ks.map((_,i)=>'$'+(i+1)).join(',')+') on conflict('+conflict+') '+(ignore?'do nothing':'do update set '+ks.filter(k=>!conflict.split(',').includes(k)).map(k=>k+'=excluded.'+k).join(',')),vs)
      else await q('update '+table+' set '+ks.map((k,i)=>k+'=$'+(i+1)).join(',')+(params?' where '+keys.map((k,i)=>k+'=$'+(ks.length+i+1)).join(' and '):''),[...vs,...vals])
      return{data:null,error:null}}
     const data=await q('select * from '+table+(params?' where '+params:''),vals)
     return head?{data:null,count:data.length,error:null}:{data,error:null}
    }catch(e){return{data:null,error:{message:e.message}}}})().then(resolve,reject)}
   };return query
  }}
 const load=Module._load
 Module._load=function(name,parent,...rest){if(name==='@/lib/supabase/server')return{createClient:async()=>db};return load.call(this,name,parent,...rest)}
 delete require.cache[require.resolve('../src/lib/auth/api-auth.ts')]
 delete require.cache[require.resolve('../src/lib/curriculum/import-service.ts')]
 const {previewCurriculum,prepareCurriculum}=require('../src/lib/curriculum/import-service.ts')
 const route=require('../src/app/api/admin/curriculum/import/route.ts')
 const post=async(body,origin)=>route.POST(new Request('http://localhost/api/admin/curriculum/import',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)}))
 const call=async(body)=>{const response=await post(body),json=await response.json();assert.equal(response.status,200,JSON.stringify(json));return json.data}
 const importAll=async(doc)=>{const p=await call({action:'preview',payload:doc}),start=await call({action:'prepare',payload:p.document,revision:p.revision});let offset=0,batches=[];do{const batch=await call({action:'batch',source_id:start.source_id,offset});batches.push(batch);offset=batch.next_offset;if(batch.done)break}while(true);return{start,batches}}
 try{
 await actor(ADMIN)
 await t.test('downloaded example passes the real Validate and Preview handler without changing existing records',async()=>{
  const snapshot=async()=>q("select jsonb_build_object('paths',(select jsonb_agg(to_jsonb(t)) from learning_paths t),'modules',(select jsonb_agg(to_jsonb(t)) from learning_modules t),'lessons',(select jsonb_agg(to_jsonb(t)) from lessons t),'backups',(select jsonb_agg(to_jsonb(t)) from curriculum_backups t),'sources',(select jsonb_agg(to_jsonb(t)) from curriculum_sources t)) state")
  const before=await snapshot()
  const preview=await call({action:'preview',payload:downloadExample})
  assert.deepEqual(preview.counts,{paths:1,modules:1,lessons:1});assert.equal(preview.conflicts.length,0)
  assert.deepEqual(await snapshot(),before)
 })
 await t.test('auth, role, origin, malformed and oversized requests fail before writes',async()=>{
  guest=true;assert.equal((await post({action:'preview',payload:example})).status,401);guest=false
  role='tester';assert.equal((await post({action:'preview',payload:example})).status,403);role='admin'
  assert.equal((await post({action:'preview',payload:example},'https://foreign.example')).status,403)
  assert.equal((await route.POST(new Request('http://localhost/api/admin/curriculum/import',{method:'POST',body:'{'}))).status,400)
  assert.equal((await route.POST(new Request('http://localhost/api/admin/curriculum/import',{method:'POST',headers:{'content-length':'26000000'},body:'{}'}))).status,413)
  const bad=clone(example);bad.paths[0].modules[1].lessons[0].content_ar=''
  assert.equal((await post({action:'prepare',payload:bad,revision:'0'.repeat(32)})).status,400)
  assert.equal((await q('select count(*)::int n from learning_paths'))[0].n,0)
 })
 let first,second,ids
 await t.test('preview and import complete authored bilingual sample as drafts with exercises and backup',async()=>{
  const preview=await call({action:'preview',payload:example});assert.deepEqual(preview.counts,{paths:1,modules:2,lessons:2});assert.equal(preview.conflicts.length,0)
  const result=await importAll(example);assert.equal(result.batches[0].inserted_lessons,2)
  assert.ok(result.start.backup_id)
  const rows=await q('select l.* from lessons l join learning_modules m on m.id=l.module_id order by m.sort_order,l.sort_order');[first,second]=rows
  assert.equal(first.content_ar,example.paths[0].modules[0].lessons[0].content_ar)
  assert.equal((await q('select body from lesson_activities where lesson_id=$1 order by (body->>\'sort_order\')::int',[first.id]))[0].body.explanation.ar,example.paths[0].modules[0].lessons[0].practice[0].explanation.ar)
  ids=rows.map(l=>l.id);assert.ok(rows.every(l=>!l.is_published))
  await actor(USER);assert.equal((await q('select * from lessons')).length,0);assert.equal((await q('select * from learning_modules')).length,0);await actor(ADMIN)
 })
 await t.test('re-import preserves IDs, manual edits, activities and publication; stale preview fails',async()=>{
  const stale=await previewCurriculum(db,example)
  await q("update lessons set content_en=content_en||' Manual note.' where id=$1",[first.id])
  await assert.rejects(()=>prepareCurriculum(db,example,stale.revision),e=>e.status===409)
  const preview=await call({action:'preview',payload:example});assert.equal(preview.preserved,1);assert.equal(preview.create.lessons,0)
  const repeat=await importAll(example);assert.equal(repeat.batches[0].inserted_lessons,0);assert.equal(repeat.batches[0].kept_existing,2)
  assert.match((await q('select content_en from lessons where id=$1',[first.id]))[0].content_en,/Manual note/)
  assert.deepEqual((await q('select l.id from lessons l join learning_modules m on m.id=l.module_id order by m.sort_order,l.sort_order')).map(l=>l.id),ids)
 })
 await t.test('exercise editing uses the guarded HTTP route, preserves old versions and rejects stale saves',async()=>{
  const practiceRoute=require('../src/app/api/admin/curriculum/practice/route.ts')
  const saved=(await q('select updated_at from lessons where id=$1',[first.id]))[0]
  const activities=clone(example.paths[0].modules[0].lessons[0].practice)
  activities[0].explanation.en+=' Reviewed explanation.'
  const request=()=>new Request('http://localhost/api/admin/curriculum/practice',{method:'POST',body:JSON.stringify({lesson_id:first.id,expected_updated:new Date(saved.updated_at).toISOString(),practice:activities})})
  const response=await practiceRoute.POST(request());assert.equal(response.status,200,JSON.stringify(await response.json()))
  assert.equal((await q('select count(*)::int n from lesson_activities where lesson_id=$1 and retired',[first.id]))[0].n,3)
  assert.equal((await practiceRoute.POST(request())).status,409)
  const before=await q('select to_jsonb(l) body from lessons l order by id')
  const backup=await call({action:'backup'});assert.equal(backup.format,'testcraft-master-backup-v1');assert.equal(backup.lessons.length,2);assert.ok(backup.activities.length>=6)
  assert.deepEqual(backup.lessons.map(l=>l.id).sort(),ids.slice().sort())
  assert.deepEqual(await q('select to_jsonb(l) body from lessons l order by id'),before)
 })
 await t.test('publication exposes content; previous/next follows actual module ordering and respects gates',async()=>{
  await q('select curriculum_publish($1,true)',[first.id]);await q('select curriculum_publish($1,true)',[second.id])
  await actor(USER)
  let nav=(await q('select curriculum_lesson_navigation($1) n',[first.id]))[0].n
  assert.equal(nav.previous,null);assert.equal(nav.next.id,second.id);assert.equal(nav.next.available,false);assert.equal(nav.total,2)
  uid=USER;role='tester'
  const {getLearningPathWithProgress}=require('../src/lib/academy/services/ModuleService.ts')
  let path=await getLearningPathWithProgress(first.learning_path_id,USER,'ar')
  assert.equal(path.error,null);assert.equal(path.data.modules.length,2);assert.equal(path.data.modules[1].status,'locked')
  assert.equal(path.data.modules[0].lessons[0].title,first.title_ar)
  delete require.cache[require.resolve('../src/lib/academy/services/ProgressService.ts')]
  const {completeLessonAndSync,markLessonInProgress}=require('../src/lib/academy/services/ProgressService.ts')
  assert.equal((await markLessonInProgress(USER,first.id)).error,null)
  const completed=await completeLessonAndSync(USER,first.id);assert.equal(completed.error,null);assert.equal(completed.data.moduleCompleted,true)
  assert.equal((await q('select status from lesson_progress where lesson_id=$1',[first.id]))[0].status,'completed')
  assert.equal((await completeLessonAndSync(USER,first.id)).error,null)
  assert.equal((await q("select sum(amount)::int n from xp_transactions where reason='lesson_completed'"))[0].n,10)
  nav=(await q('select curriculum_lesson_navigation($1) n',[first.id]))[0].n
  assert.equal(nav.next.available,true);assert.equal(nav.completed,1)
  path=await getLearningPathWithProgress(first.learning_path_id,USER,'en')
  assert.equal(path.data.modules[0].status,'completed');assert.equal(path.data.modules[1].status,'available')
  nav=(await q('select curriculum_lesson_navigation($1) n',[second.id]))[0].n;assert.equal(nav.previous.id,first.id);assert.equal(nav.next,null)
  await actor(ADMIN);uid=ADMIN;role='admin'
 })
 await t.test('archive hides descendants, keeps progress/IDs, and can be restored without publication',async()=>{
  await q("select curriculum_set_state('path',$1,'archived')",[first.learning_path_id]);await actor(USER)
  assert.equal((await q('select * from lessons')).length,0);assert.equal((await q('select * from learning_modules')).length,0)
  assert.equal((await q('select * from lesson_progress where lesson_id=$1',[first.id])).length,1)
  await assert.rejects(()=>q('select curriculum_lesson_navigation($1)',[first.id]),/unavailable/)
  await actor(ADMIN);await q("select curriculum_set_state('path',$1,'draft')",[first.learning_path_id]);await actor(USER)
  assert.equal((await q('select * from lessons')).length,0);await actor(ADMIN)
  await q("select curriculum_set_state('path',$1,'published')",[first.learning_path_id])
 })
 await t.test('atomic reorder and direct RPC authorization, export round trip and module conflict checks',async()=>{
  await q("select curriculum_reorder('module',$1::uuid[])",[[second.module_id,first.module_id]])
  await actor(USER)
  // The reordered first module is now the one previously second.
  assert.equal((await q('select curriculum_lesson_navigation($1) n',[second.id]))[0].n.next.id,first.id)
  await assert.rejects(()=>q("select curriculum_import_json_batch($1,0,25)",['00000000-0000-4000-8000-000000000099']),/Administrator/)
  await actor(ADMIN)
  const response=await route.GET(),exported=await response.json();assert.equal(response.status,200)
  assert.match(response.headers.get('content-type'),/^application\/json/)
  assert.equal(response.headers.get('content-disposition'),'attachment; filename="testcraft-curriculum.json"')
  assert.equal(response.headers.get('cache-control'),'no-store')
  curriculumImportSchema.parse(exported)
  const roundtrip=await importAll(exported);assert.equal(roundtrip.batches[0].inserted_lessons,0)
  const conflict=clone(example);const lesson=conflict.paths[0].modules[0].lessons.pop();conflict.paths[0].modules[1].lessons.push(lesson)
  const p=await call({action:'preview',payload:conflict});assert.equal(p.conflicts.length,1)
  assert.equal((await post({action:'prepare',payload:p.document,revision:p.revision})).status,409)
  await assert.rejects(()=>q("select curriculum_reorder('lesson',$1::uuid[])",[ids]),/one parent/)
 })
 await t.test('346-lesson fixture writes 14 actual batches; retry and partial resume never duplicate',async()=>{
  // Only a synthetic scale fixture: copies an existing authored lesson, not a proposed lesson catalog.
  const bulk=clone(example);bulk.paths[0].slug='bulk-fixture';bulk.paths[0].modules=bulk.paths[0].modules.slice(0,1)
  const sample=bulk.paths[0].modules[0].lessons[0];bulk.paths[0].modules[0].lessons=Array.from({length:346},(_,i)=>({...clone(sample),slug:'fixture-'+i}))
  const p=await call({action:'preview',payload:bulk}),start=await call({action:'prepare',payload:p.document,revision:p.revision})
  const initial=await call({action:'batch',source_id:start.source_id,offset:0});assert.equal(initial.inserted_lessons,25)
  const retry=await call({action:'batch',source_id:start.source_id,offset:0});assert.equal(retry.inserted_lessons,0);assert.equal(retry.kept_existing,25)
  const resumed=await importAll(bulk);assert.equal(resumed.batches.length,14);assert.equal(resumed.batches.reduce((n,b)=>n+b.inserted_lessons,0),321)
  assert.equal(resumed.batches.at(-1).done,true);assert.equal(resumed.batches.at(-1).processed,21)
  const count=(await q("select count(*)::int n from lessons l join learning_paths p on p.id=l.learning_path_id where p.slug='bulk-fixture'"))[0].n;assert.equal(count,346)
  assert.equal((await q("select count(*)::int n from lessons where is_published"))[0].n,2)
  assert.equal((await q('select count(*)::int n from challenges'))[0].n,0)
 })
 }finally{Module._load=load;delete require.cache[require.resolve('../src/lib/auth/api-auth.ts')];await pg.close()}
})
