require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module')

test('curriculum page reads legacy data and reports migration 034 without querying missing archive columns',async()=>{
 const load=Module._load,originalError=console.error
 const logs=[],selections=[]
 let schemaError={code:'PGRST202',message:'Could not find the function curriculum_path_status'},tableError=null
 const rows={
  learning_paths:[{id:'path-1',slug:'qa',title_en:'QA Foundations',title_ar:'أساسيات الجودة',sort_order:0,is_active:false}],
  learning_modules:[{id:'module-1',learning_path_id:'path-1',slug:'basics',title_en:'Basics',sort_order:0,is_published:false}],
  lessons:[{id:'lesson-1',learning_path_id:'path-1',module_id:'module-1',slug:'testing',title_en:'Testing',sort_order:0,is_published:false,content_en:'Existing content',content_ar:'المحتوى الحالي'}],
  challenges:[],
 }
 const db={
  from(table){let columns='';const query={select(value){columns=value;selections.push({table,columns});return query},order(){return query},then(resolve,reject){
   const error=tableError||(table==='lessons'&&columns.split(',').some(c=>c.trim()==='archived_at')?{code:'42703',message:'column lessons.archived_at does not exist'}:null)
   return Promise.resolve({data:error?null:rows[table],error}).then(resolve,reject)
  }};return query},
  async rpc(name,args,options){assert.equal(name,'curriculum_path_status');assert.equal(args.p_path,'00000000-0000-0000-0000-000000000000');assert.deepEqual(options,{head:true});return{data:null,error:schemaError}},
 }
 try{
  Module._load=function(name,parent,...rest){
   if(name==='@/lib/supabase/server')return{createClient:async()=>db}
   if(name==='@/lib/auth/require-admin')return{requireAdmin:async()=>({})}
   return load.call(this,name,parent,...rest)
  }
  console.error=(...args)=>logs.push(args)
  delete require.cache[require.resolve('../src/lib/admin/curriculum.ts')]
  const {getCurriculumTree}=require('../src/lib/admin/curriculum.ts')
  let result=await getCurriculumTree()
  assert.equal(result.error,null);assert.equal(result.data.requiresMigration,true)
  assert.equal(result.data.paths[0].modules[0].lessons[0].content_ar,'المحتوى الحالي')
  assert.equal(result.data.paths[0].modules[0].lessons[0].archived_at,null)
  assert.equal(result.data.stats.totalLessons,1)
  assert.equal(logs.length,0,'Expected schema setup states must not trigger the Next console-error overlay')
  assert.ok(selections.some(x=>x.table==='lessons'&&x.columns==='*'))

  schemaError={code:'42703',message:'column lessons.archived_at does not exist'}
  result=await getCurriculumTree();assert.equal(result.error,null);assert.equal(result.data.requiresMigration,true)
  assert.equal(logs.length,0)

  schemaError=null;rows.lessons[0].archived_at='2026-11-05T00:00:00Z'
  result=await getCurriculumTree();assert.equal(result.error,null);assert.equal(result.data.requiresMigration,false)
  assert.equal(result.data.paths[0].modules[0].lessons[0].archived_at,'2026-11-05T00:00:00Z')

  tableError={code:'42501',message:'Permission denied'}
  result=await getCurriculumTree();assert.equal(result.data,null);assert.equal(result.error,'Permission denied');assert.equal(logs.length,1)
 }finally{Module._load=load;console.error=originalError;delete require.cache[require.resolve('../src/lib/admin/curriculum.ts')]}
})

test('import RPCs return a useful 503 for missing schema and retain other errors',async()=>{
 const {curriculumRPC}=require('../src/lib/curriculum/import-service.ts')
 for(const code of ['42703','42883','42P01','PGRST202','PGRST204','PGRST205']){
  await assert.rejects(()=>curriculumRPC({rpc:async()=>({data:null,error:{code,message:'Missing schema'}})},'curriculum_export_json'),e=>e.status===503&&e.message.includes('034_simple_curriculum.sql'))
 }
 await assert.rejects(()=>curriculumRPC({rpc:async()=>({data:null,error:{code:'40001',message:'Changed'}})},'curriculum_prepare_json'),e=>e.status===409)
})

test('setup notice provides Arabic instructions and import controls remain disabled until ready',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
 const {CurriculumSetupNotice}=require('../src/components/admin/curriculum/curriculum-setup-notice.tsx')
 const html=renderToStaticMarkup(React.createElement(CurriculumSetupNotice,{locale:'ar'}))
 assert.match(html,/يلزم تحديث قاعدة بيانات المنهج/);assert.match(html,/034_simple_curriculum.sql/);assert.match(html,/SQL Editor/)
 const load=Module._load
 try{
  Module._load=function(name,parent,...rest){if(name==='next/navigation')return{useRouter:()=>({refresh(){}})};return load.call(this,name,parent,...rest)}
  const {ImportCurriculum}=require('../src/components/admin/curriculum/import-curriculum.tsx')
  const markup=renderToStaticMarkup(React.createElement(ImportCurriculum,{locale:'ar',ready:false}))
  assert.match(markup,/<button[^>]*disabled=""[^>]*>تصدير المنهج<\/button>/)
  assert.match(markup,/<button[^>]*disabled=""[^>]*>التحقق ومعاينة التغييرات<\/button>/)
  assert.doesNotMatch(markup,/<button[^>]*disabled=""[^>]*>تنزيل نسخة احتياطية<\/button>/)
 }finally{Module._load=load}
})
