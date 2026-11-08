require('../scripts/register-ts.cjs')
const {test}=require('node:test')
const assert=require('node:assert/strict')
const Module=require('node:module')
const {registerSchema}=require('../src/lib/validations/auth.ts')
const {accountIdentity,getDisplayName}=require('../src/lib/auth/account-identity.ts')

const user = {id:'12345600-0000-4000-8000-000000000002',email:'private-mail@example.test',user_metadata:{}}

test('registration accepts a chosen Unicode display name and existing users get a safe fallback',()=>{
  const signup=registerSchema.parse({displayName:'  نور الاختبار  ',email:'Learner@Example.Test',
    password:'Fixture!1234',confirmPassword:'Fixture!1234',acceptTerms:true})
  assert.equal(signup.displayName,'نور الاختبار')
  assert.equal(signup.email,'learner@example.test')
  assert(!registerSchema.safeParse({...signup,displayName:'Name\u202e'}).success)
  assert.equal(getDisplayName(user,'private_mail_123456','en'),'TestCraft learner')
  assert.equal(getDisplayName({...user,user_metadata:{username:'Chosen_Name'}},'Chosen_Name_123456','en'),'Chosen_Name')
  assert.equal(getDisplayName({...user,user_metadata:{username:'OldChoice'}},'Edited_Handle','en'),'Edited_Handle')
  assert.equal(getDisplayName({...user,user_metadata:{name:'نور QA'}},undefined,'ar'),'نور QA')
  const explicit={...user,user_metadata:{display_name:'نور الاختبار',picture:'https://example.test/profile.png'}}
  assert.deepEqual(accountIdentity(explicit,{username:'hidden_123456',avatar_url:'javascript:bad'},'ar'),
    {name:'نور الاختبار',email:user.email,avatar:'https://example.test/profile.png'})
})

test('profile action uses verified identity and rejects extra or protected fields before writes',async()=>{
  const load=Module._load
  const writes=[]
  let active=null
  try {
    Module._load=function(name,parent,...rest){
      if(name==='@/lib/supabase/server') return {createClient:async()=>({
        auth:{getUser:async()=>({data:{user:active},error:null}),updateUser:async value=>{
          writes.push(value)
          return {data:{user:{user_metadata:value.data}},error:null}
        }},
        from(table){
          assert.equal(table,'profiles')
          return {
            update(value){ writes.push(value); return this },
            eq(key,value){ assert.equal(key,'id'); assert.equal(value,active.id); return this },
            select(){return this},
            single:async()=>({data:{username:writes.at(-1).username},error:null}),
          }
        },
      })}
      return load.call(this,name,parent,...rest)
    }
    const {updateProfile}=require('../src/lib/settings/profile.ts')
    assert.equal((await updateProfile({displayName:'Another person'})).error,'unauthorized')
    active=user
    for (const input of [
      {displayName:'Other Name',id:'other-user'}, {username:'test-user',role:'admin'},
      {displayName:'Other Name',total_xp:9999}, {displayName:'Other Name',app_metadata:{role:'admin'}},
      {displayName:'Other Name',username:'two-fields'}, {displayName:'\n\n'},
    ]) assert.equal((await updateProfile(input)).error,'invalid_data')
    assert.deepEqual(writes,[])
    assert.deepEqual(await updateProfile({displayName:'  نور الاختبار  '}),{data:{value:'نور الاختبار'},error:null})
    assert.deepEqual(await updateProfile({username:'  exact-handle  '}),{data:{value:'exact-handle'},error:null})
    assert.deepEqual(writes,[{data:{display_name:'نور الاختبار'}},{username:'exact-handle'}])
  } finally {
    Module._load=load
    delete require.cache[require.resolve('../src/lib/settings/profile.ts')]
  }
})
