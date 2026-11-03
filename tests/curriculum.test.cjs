require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module')
const {curriculumManifestSchema,flattenManifest,parseManifestCSV}=require('../src/lib/curriculum/curriculum-manifest.schema.ts')
const {contentBundleSchema}=require('../src/lib/curriculum/content.schema.ts')
const {gradeActivity,publicActivity}=require('../src/lib/curriculum/grading.ts')
const bundle=JSON.parse(fs.readFileSync('content/pilot-bundle.json','utf8')),copy=v=>structuredClone(v)
test('authored bilingual pilot passes quality gates with exact counts',()=>{
 const b=contentBundleSchema.parse(bundle);assert.equal(b.lessons.length,9)
 assert.equal(b.lessons.reduce((n,l)=>n+l.activities.length,0),27)
 assert.equal(b.module_assessments.reduce((n,m)=>n+m.activities.length,0),9)
 for(const l of b.lessons){assert.equal(l.is_published,false);assert.ok(l.content_ar.includes('##'));assert.ok(l.content_en.length>2200)}
})
test('Markdown and bundle content stay in sync across Git line-ending conversion',()=>{
 for(const l of bundle.lessons)for(const lang of ['en','ar']){
  const file=fs.readFileSync('content/lessons/'+l.key.split('/').pop()+'.'+lang+'.md','utf8')
   .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim()
  const bundled=l['content_'+lang].replace(/\r\n?/g,'\n').trim()
  assert.equal(file,bundled,l.key+'/'+lang)
 }
})
test('reject duplicate scoped slugs/order and unknown or future prerequisites',()=>{
 for(const change of [
 m=>m.paths.push(copy(m.paths[0])),
 m=>m.paths[0].modules[0].lessons[1].sort_order=1,
 m=>m.paths[0].modules[1].lessons[0].lesson_slug=m.paths[0].modules[0].lessons[0].lesson_slug,
 m=>m.paths[0].modules[0].lessons[0].prerequisites=['unknown/module/lesson'],
 m=>m.paths[0].modules[0].lessons[0].prerequisites=['qa-foundations/intro-to-qa/qa-vs-qc']
 ]){const m=copy(bundle.manifest);change(m);assert.equal(curriculumManifestSchema.safeParse(m).success,false)}
})
test('CSV round-trips bilingual inventory and rejects conflicts/malformed quotes',()=>{
 const csv=fs.readFileSync('content/verified-manifest.csv','utf8')
 assert.deepEqual(parseManifestCSV(csv).paths,bundle.manifest.paths)
 assert.throws(()=>parseManifestCSV(csv+'"unfinished'),/quote/)
 assert.throws(()=>parseManifestCSV(csv.replace('"QA Foundations"','"Another Path"')),/Conflicting/)
})
test('actual neighbors and quality/answer-key gates reject weak content',()=>{
 const entries=flattenManifest(bundle.manifest)
 assert.equal(entries[0].previous_key,null);assert.equal(entries[2].next_key,null)
 for(const change of [
 b=>b.lessons[0].next_key='fictional/module/lesson',
 b=>b.lessons[0].content_en+=' TODO placeholder',
 b=>b.lessons[0].title_en='Invented title',
 b=>b.lessons[0].activities[0].answer=['unknown'],
 b=>b.lessons[0].content_ar=b.lessons[0].content_en
 ]){const b=copy(bundle);change(b);assert.equal(contentBundleSchema.safeParse(b).success,false)}
})
test('objective grading uses exact sets; open answers require review; DTO hides keys',()=>{
 const question=bundle.lessons[1].activities.find(a=>a.kind==='multi_select')
 assert.deepEqual(gradeActivity(question,[...question.answer].reverse()),{status:'graded',score:1})
 assert.equal(gradeActivity(question,question.answer.slice(0,1)).score,0)
 assert.throws(()=>gradeActivity(question,['unknown']),/Invalid/)
 assert.throws(()=>gradeActivity(question,['a','a']),/Invalid/)
 const open=bundle.lessons[0].activities.find(a=>a.kind==='short_answer')
 assert.deepEqual(gradeActivity(open,[],'An actual learner response with evidence.'),{status:'needs_review',score:null})
 assert.doesNotMatch(JSON.stringify(publicActivity({id:'fixture',version:1,body:question})),/"answer"|"rubric"|"explanation"/)
})
test('structured provider validates content and classifies401/timeout/malformed outputs',async()=>{
 const {generateLesson,providerConfig,ProviderError}=require('../src/lib/curriculum/provider.ts')
 const previous=process.env.OPENAI_API_KEY
 process.env.OPENAI_API_KEY='fixture-key-no-network';process.env.CURRICULUM_MODEL='fixture-model'
 process.env.CURRICULUM_INPUT_USD_PER_MILLION='1';process.env.CURRICULUM_OUTPUT_USD_PER_MILLION='2'
 try{
 const spec=flattenManifest(bundle.manifest)[0],config=providerConfig()
 const success=await generateLesson(spec,config,async(url,request)=>{
  assert.equal(url,'https://api.openai.com/v1/responses')
  const body=JSON.parse(request.body);assert.equal(body.store,false)
  assert.equal(body.text.format.type,'json_schema');assert.equal(body.text.format.strict,true)
  assert.doesNotMatch(body.input,/user_id|student_id/)
  return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{type:'output_text',text:JSON.stringify({lesson:bundle.lessons[0],module_assessment:[]})}]}]})
 })
 assert.equal(success.output.lesson.key,spec.key);assert.ok(config.request_ceiling_usd>=success.actualCost)
 await assert.rejects(()=>generateLesson(spec,config,async()=>new Response('',{status:401})),e=>e instanceof ProviderError&&!e.retryable)
 await assert.rejects(()=>generateLesson(spec,config,async()=>{throw Error('timeout')}),e=>e.retryable&&e.message.includes('reservation'))
 await assert.rejects(()=>generateLesson(spec,config,async()=>Response.json({status:'completed',usage:{input_tokens:10,output_tokens:10},output:[{content:[{type:'output_text',text:'not JSON'}]}]})),e=>e.retryable&&e.actualCost>0)
 }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous}
})
test('admin API returns401/403 before reading data or triggering generation',async()=>{
 const load=Module._load;let signedIn=false
 Module._load=function(name,parent,...rest){
  if(name==='@/lib/supabase/server'||name.endsWith('/lib/supabase/server'))return{createClient:async()=>({
   auth:{getUser:async()=>({data:{user:signedIn?{id:'fixture-user'}:null},error:null})},
   from:()=>({select(){return this},eq(){return this},single:async()=>({data:{role:'tester'},error:null})})
  })}
  return load.call(this,name,parent,...rest)
 }
 try{
  delete require.cache[require.resolve('../src/lib/auth/api-auth.ts')]
  delete require.cache[require.resolve('../src/app/api/admin/curriculum/route.ts')]
  const route=require('../src/app/api/admin/curriculum/route.ts')
  const request=()=>new Request('http://localhost/api/admin/curriculum',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start'})})
  assert.equal((await route.POST(request())).status,401)
  signedIn=true;assert.equal((await route.POST(request())).status,403)
 }finally{Module._load=load}
})

