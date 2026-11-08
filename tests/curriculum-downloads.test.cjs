require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module')
const {PGlite}=require('@electric-sql/pglite')
const {curriculumImportSchema}=require('../src/lib/curriculum/import-schema.ts')
const {curriculumDownloadNames}=require('../src/lib/curriculum/downloads.ts')
const ADMIN='00000000-0000-4000-8000-000000000001',USER='00000000-0000-4000-8000-000000000002'

test('public curriculum file routing skips localization and config supplies JSON attachment headers',async()=>{
 const {middleware}=require('../src/middleware.ts'),{NextRequest}=require('next/server')
 const {PHASE_PRODUCTION_BUILD}=require('next/constants')
 const config=(await import('../next.config.mjs')).default(PHASE_PRODUCTION_BUILD),headers=await config.headers()
 for(const file of ['schema','example']){
  const pathname='/curriculum/'+file+'.json'
  const response=await middleware(new NextRequest('http://localhost'+pathname))
  assert.equal(response.status,200);assert.equal(response.headers.get('location'),null)
  const h=Object.fromEntries(headers.find(h=>h.source===pathname).headers.map(h=>[h.key,h.value]))
  assert.equal(h['Content-Type'],'application/json; charset=utf-8')
  assert.equal(h['Content-Disposition'],`attachment; filename="curriculum-${file}.json"`)
 }
 const other=await middleware(new NextRequest('http://localhost/curriculum/other.json'))
 assert.equal(other.status,307);assert.equal(other.headers.get('location'),'http://localhost/en/curriculum/other.json')
})

test('production download and import handlers run the exact example through preview, draft save and publish in isolated PostgreSQL',async t=>{
 const pg=new PGlite({initialMemory:128*1024*1024}),q=async(sql,args=[])=>(await pg.query(sql,args)).rows
 let uid=ADMIN,guest=false,failBackup=false
 const actor=async id=>{uid=id;await pg.exec("reset role;set role authenticated;set request.jwt.claim.sub='"+id+"'")}
 const db={auth:{getUser:async()=>({data:{user:guest?null:{id:uid}},error:null})},
  async rpc(name,args={}){try{
   if(failBackup&&name==='curriculum_backup')throw Error('Backup unavailable')
   const values=Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v)
   return{data:(await q('select public.'+name+'('+Object.keys(args).map((k,i)=>k+'=> $'+(i+1)).join(',')+') result',values))[0].result,error:null}
  }catch(e){return{data:null,error:{message:e.message,code:e.code}}}},
  from(table){const filters={};const query={select(){return query},eq(k,v){filters[k]=v;return query},async single(){try{
   const keys=Object.keys(filters),data=await q('select * from '+table+(keys.length?' where '+keys.map((k,i)=>k+'=$'+(i+1)).join(' and '):''),Object.values(filters))
   return{data:data[0]||null,error:null}
  }catch(e){return{data:null,error:{message:e.message}}}}};return query}}
 const load=Module._load
 Module._load=function(name,parent,...rest){if(name==='@/lib/supabase/server')return{createClient:async()=>db};return load.call(this,name,parent,...rest)}
 try{
  await pg.exec(fs.readFileSync('tests/fixtures/database.sql','utf8'))
  for(const name of fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20).sort())await pg.exec(fs.readFileSync('supabase/migrations/'+name,'utf8').replace(/^\uFEFF/,''))
  for(const name of ['../src/lib/auth/api-auth.ts','../src/lib/curriculum/import-service.ts'])delete require.cache[require.resolve(name)]
  const download=require('../src/app/api/admin/curriculum/download/route.ts'),imports=require('../src/app/api/admin/curriculum/import/route.ts')
  const req=(file,method='GET',origin)=>new Request('http://localhost/api/admin/curriculum/download?file='+file,{method,headers:origin?{origin}:{}})
  const post=async body=>{const response=await imports.POST(new Request('http://localhost/api/admin/curriculum/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));const json=await response.json();assert.equal(response.status,200,JSON.stringify(json));return json.data}
  const read=async(response,file)=>{
   assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/json; charset=utf-8')
   assert.equal(response.headers.get('content-disposition'),`attachment; filename="${curriculumDownloadNames[file]}"`)
   assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff')
   const text=await response.text();assert.ok(text.endsWith('\n'));return JSON.parse(text)
  }
  const content=async()=>{await pg.exec('reset role');try{return await q("select jsonb_build_object('paths',(select jsonb_agg(to_jsonb(t) order by id) from learning_paths t),'modules',(select jsonb_agg(to_jsonb(t) order by id) from learning_modules t),'lessons',(select jsonb_agg(to_jsonb(t) order by id) from lessons t),'xp',(select jsonb_agg(to_jsonb(t) order by id) from xp_transactions t)) data")}finally{await actor(uid)}}
  await actor(ADMIN)
  let exactExample,lessonId,pathId,moduleId
  await t.test('schema/example are complete attachments and preview is read only',async()=>{
   const before=await content()
   const schema=await read(await download.GET(req('schema')),'schema')
   assert.deepEqual(schema,JSON.parse(fs.readFileSync('public/curriculum/schema.json','utf8')))
   exactExample=await read(await download.GET(req('example')),'example')
   assert.deepEqual(exactExample,JSON.parse(fs.readFileSync('public/curriculum/example.json','utf8')))
   curriculumImportSchema.parse(exactExample)
   const preview=await post({action:'preview',payload:exactExample});assert.deepEqual(preview.counts,{paths:1,modules:1,lessons:1})
   assert.deepEqual(await content(),before)
  })
  await t.test('the exact downloaded JSON saves one draft with real path/module foreign keys',async()=>{
   const preview=await post({action:'preview',payload:exactExample}),start=await post({action:'prepare',payload:preview.document,revision:preview.revision})
   const batch=await post({action:'batch',source_id:start.source_id,offset:0});assert.equal(batch.inserted_lessons,1);assert.equal(batch.done,true)
   const rows=await q('select l.*,m.learning_path_id module_path,m.is_published module_published,p.is_active from lessons l join learning_modules m on m.id=l.module_id join learning_paths p on p.id=l.learning_path_id')
   assert.equal(rows.length,1);const l=rows[0];lessonId=l.id;pathId=l.learning_path_id;moduleId=l.module_id
   assert.equal(l.module_path,pathId);assert.equal(l.is_published,false);assert.equal(l.module_published,false);assert.equal(l.is_active,false)
   assert.equal(l.content_ar,exactExample.paths[0].modules[0].lessons[0].content_ar)
   await actor(USER);assert.equal((await q('select * from lessons')).length,0);await actor(ADMIN)
  })
  await t.test('export and backup include the saved draft and preserve curriculum and reward rows',async()=>{
   const before=await content()
   const exported=await read(await download.GET(req('export')),'export');curriculumImportSchema.parse(exported)
   assert.equal(exported.paths[0].modules[0].lessons[0].status,'draft')
   const backup=await read(await download.POST(req('backup','POST')),'backup')
   assert.equal(backup.format,'testcraft-master-backup-v1');assert.equal(backup.lessons[0].id,lessonId)
   assert.equal(backup.learning_paths[0].id,pathId);assert.equal(backup.learning_modules[0].id,moduleId)
   assert.equal(backup.activities.length,exactExample.paths[0].modules[0].lessons[0].practice.length)
   assert.deepEqual(await content(),before)
  })
  await t.test('publishing through the production RPC exposes the saved lesson to students',async()=>{
   await q('select curriculum_publish($1,true)',[lessonId])
   await actor(USER)
   assert.equal((await q('select id from lessons'))[0].id,lessonId)
   assert.equal((await q('select curriculum_can_read_lesson($1) allowed',[lessonId]))[0].allowed,true)
   assert.equal((await q('select id from learning_modules'))[0].id,moduleId)
   assert.equal((await q('select id from learning_paths'))[0].id,pathId)
   await actor(ADMIN)
   const before=await content(),p=await post({action:'preview',payload:exactExample}),s=await post({action:'prepare',payload:p.document,revision:p.revision})
   const batch=await post({action:'batch',source_id:s.source_id,offset:0});assert.equal(batch.inserted_lessons,0);assert.equal(batch.kept_existing,1)
   assert.deepEqual(await content(),before)
  })
  await t.test('expired sessions and non-admin users receive JSON errors, never HTML attachments',async()=>{
   const before=await content()
   for(const [guestValue,id,status] of [[true,ADMIN,401],[false,USER,403]]){
    guest=guestValue;await actor(id)
    for(const file of ['schema','example','export','backup']){
     const response=file==='backup'?await download.POST(req(file,'POST')):await download.GET(req(file))
     assert.equal(response.status,status);assert.match(response.headers.get('content-type'),/^application\/json/)
     assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('content-disposition'),null)
     assert.ok((await response.json()).error)
    }
   }
   guest=false;await actor(ADMIN);assert.deepEqual(await content(),before)
   assert.equal((await download.POST(req('backup','POST','https://foreign.example'))).status,403)
   assert.equal((await download.GET(req('../../etc/passwd'))).status,400)
   assert.equal((await download.GET(req('backup'))).status,400)
   failBackup=true;const failed=await download.POST(req('backup','POST'));failBackup=false
   assert.equal(failed.status,400);assert.equal(failed.headers.get('content-disposition'),null)
  })
 }finally{Module._load=load;await pg.close()}
})
