require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module')

test('challenge duplication reuses the same draft and hidden bug seeds for a repeated request id',async()=>{
 const load=Module._load
 const id='40000000-0000-4000-8000-000000000001',requestId='50000000-0000-4000-8000-000000000001'
 const source={id,slug:'login-practice',title_en:'Login',title_ar:'تسجيل الدخول',practical_app_key:'login_form',sort_order:3,
  challenge_type:'bug_hunt',difficulty:'beginner',base_xp_reward:100,is_required:true,is_active:true,scenario_en:'Scenario',scenario_ar:'السيناريو',
  instructions_en:'Instructions',instructions_ar:'التعليمات',description_en:'Description',description_ar:'الوصف',module_id:null,lesson_id:null,learning_path_id:null}
 const challenges=[source],bugs=[{challenge_id:id,bug_key:'invalid_email_validation_missing',bug_title:'Email validation',description:'',actual_severity:'Medium',bonus_xp:25,is_active:true}]
 let backups=0,creates=0
 const db={
  from(table){
   const query={filter:null,columns:null,select(columns){this.columns=columns;return this},eq(key,value){this.filter={key,value};return this},
    async single(){const data=table==='challenges'&&this.filter?.key==='id'?challenges.find(row=>row.id===this.filter.value)||null:null;return{data,error:data?null:{message:'not found'}}},
    async maybeSingle(){const data=table==='challenges'&&this.filter?.key==='slug'?challenges.find(row=>row.slug===this.filter.value)||null:null;return{data:data?{id:data.id}:null,error:null}},
    then(resolve,reject){const data=table==='hidden_bugs'?bugs.filter(row=>row.challenge_id===this.filter?.value):[];return Promise.resolve({data,error:null}).then(resolve,reject)}}
   return query
  },
  async rpc(name){assert.equal(name,'curriculum_backup');backups++;return{data:'backup-fixture',error:null}}
 }
 Module._load=function(name,parent,...rest){
  if(name==='@/lib/auth/api-auth')return{apiUser:async()=>({db,user:{id:'admin-fixture'}}),checkOrigin(){},ApiError:class extends Error{},apiFailure(error){return Response.json({error:error.message},{status:error.status||400})}}
  if(name==='@/lib/admin/practical-challenges')return{createPracticalChallenge:async(input)=>{creates++;const row={...input,id:'60000000-0000-4000-8000-000000000001',status:input.is_active?'published':'draft'};challenges.push(row);bugs.push(...input.embedded_bugs.map(bug=>({...bug,challenge_id:row.id})));return{data:row,error:null}}}
  if(name==='@/lib/validations/practical-challenge')return{practicalChallengeSchema:{parse:value=>value}}
  return load.call(this,name,parent,...rest)
 }
 try{
  const routePath='../src/app/api/admin/challenges/duplicate/route.ts'
  delete require.cache[require.resolve(routePath)]
  const route=require(routePath)
  const request=()=>new Request('http://localhost/api/admin/challenges/duplicate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,request_id:requestId})})
  const first=await route.POST(request()),firstBody=await first.json()
  const second=await route.POST(request()),secondBody=await second.json()
  assert.equal(first.status,200);assert.equal(second.status,200)
  assert.equal(firstBody.data.id,secondBody.data.id)
  assert.equal(firstBody.data.is_active,false);assert.equal(firstBody.data.status,'draft')
  assert.equal(challenges.filter(row=>row.slug==='login-practice-copy-50000000000040008000000000000001').length,1)
  assert.equal(bugs.filter(row=>row.challenge_id===firstBody.data.id).length,1)
  assert.equal(creates,1);assert.equal(backups,1)
 }finally{
  Module._load=load
  delete require.cache[require.resolve('../src/app/api/admin/challenges/duplicate/route.ts')]
 }
})
