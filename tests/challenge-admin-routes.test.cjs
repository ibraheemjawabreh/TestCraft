require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module')

test('challenge mutation endpoints reject cross-origin and non-admin calls before writing',async()=>{
 const load=Module._load
 const routes=[
  {file:'../src/app/api/admin/challenges/create/route.ts',method:'POST',kind:'create'},
  {file:'../src/app/api/admin/challenges/update/route.ts',method:'POST',kind:'update'},
  {file:'../src/app/api/admin/challenges/archive/route.ts',method:'POST',kind:'archive'},
  {file:'../src/app/api/admin/challenges/delete/route.ts',method:'DELETE',kind:'delete'}
 ]
 try{
  for(const routeSpec of routes){
   let user=null,role='tester',mutations=0
   const challenge={id:'70000000-0000-4000-8000-000000000001',title:'Fixture challenge',is_active:true,status:'published'}
   const db={from(table){
    const query={filter:null,patch:null,select(){return this},eq(_key,value){this.filter=value;return this},single:async()=>table==='profiles'?{data:{role},error:null}:{data:challenge,error:null},
     update(value){this.patch=value;return this},then(resolve,reject){if(table==='challenges'&&this.patch){mutations++;Object.assign(challenge,this.patch)}return Promise.resolve({error:null}).then(resolve,reject)}}
    return query
   }}
   Module._load=function(name,parent,...rest){
    if(name==='@/lib/supabase/server')return{createClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})},...db})}
    if(name==='@/lib/admin/practical-challenges')return{
     createPracticalChallenge:async()=>{mutations++;return{data:{id:challenge.id,status:'draft'},error:null}},
     updatePracticalChallenge:async(id)=>{mutations++;return{data:{id},error:null}}
    }
    if(name==='@/lib/validations/practical-challenge')return{practicalChallengeSchema:{safeParse:data=>({success:true,data})}}
    return load.call(this,name,parent,...rest)
   }
   delete require.cache[require.resolve('../src/lib/auth/api-auth.ts')]
   delete require.cache[require.resolve(routeSpec.file)]
   const route=require(routeSpec.file)
   const input=routeSpec.kind==='create'?{title_en:'Fixture'}:routeSpec.kind==='update'?{id:challenge.id,title_en:'Fixture'}:{id:challenge.id}
   const request=(origin)=>new Request('http://localhost/api/admin/challenges/'+routeSpec.kind,{
    method:routeSpec.method,headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(input)
   })
   assert.equal((await route[routeSpec.method](request('https://attacker.example'))).status,403,routeSpec.kind+' rejects foreign origins')
   assert.equal((await route[routeSpec.method](request())).status,401,routeSpec.kind+' rejects guests')
   user={id:'80000000-0000-4000-8000-000000000001'}
   assert.equal((await route[routeSpec.method](request())).status,403,routeSpec.kind+' rejects testers')
   assert.equal(mutations,0,routeSpec.kind+' makes no writes before admin authorization')
   role='admin'
   const response=await route[routeSpec.method](request())
   assert.equal(response.status,200,routeSpec.kind+' accepts authorized admin')
   const body=await response.json()
   assert.equal(routeSpec.kind==='archive'||routeSpec.kind==='delete'?body.success:body.data.id===challenge.id,true)
   assert.equal(mutations,1)
   if(routeSpec.kind==='archive'||routeSpec.kind==='delete'){
    assert.equal(challenge.is_active,false);assert.equal(challenge.status,'archived')
   }
  }
 }finally{
  Module._load=load
  delete require.cache[require.resolve('../src/lib/auth/api-auth.ts')]
  for(const routeSpec of routes)delete require.cache[require.resolve(routeSpec.file)]
 }
})
