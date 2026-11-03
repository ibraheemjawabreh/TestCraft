require('../scripts/register-ts.cjs')
const {test}=require('node:test'),assert=require('node:assert/strict')
const {simulate,initialState}=require('../src/lib/practical-challenges/simulator.ts')
const login=(email,password)=>({type:'login',data:{email,password}})
test('login validation, credentials, recovery, processing states and all four toggles',()=>{
 const base=initialState('login_form'),now=1000
 assert.ok(simulate(base,login('bad','Goodpass1'),[],{},now).errors.email)
 assert.ok(!simulate(base,login('bad','Goodpass1'),['invalid_email_validation_missing'],{},now).errors.email)
 assert.ok(simulate(base,login('a@example.test','x'),[],{},now).errors.password)
 assert.ok(!simulate(base,login('a@example.test','x'),['short_password_validation_missing'],{},now).errors.password)
 const valid=simulate(base,login('qa.tester@testcraft.dev','Test@12345'),[],{},now)
 assert.equal(valid.view.signed_in,true);assert.equal(valid.view.busy,true);assert.equal(valid.view.submitted,1)
 assert.equal(simulate(valid.state,login('qa.tester@testcraft.dev','Test@12345'),[],{},now+100).view.submitted,1)
 const duplicate=simulate(valid.state,login('qa.tester@testcraft.dev','Test@12345'),['repeated_submission_allowed'],{},now+100)
 assert.equal(duplicate.view.submitted,2);assert.equal(duplicate.view.busy,false)
 assert.ok(simulate(base,{type:'forgot'},[],{},now).message)
 assert.equal(simulate(base,{type:'forgot'},['forgot_password_no_action'],{},now).message,null)
 assert.equal(simulate(valid.state,{type:'reset'},[],{},now).view.submitted,0)
})
test('registration required/malformed/strength/confirmation/consent/duplicate controls and reset',()=>{
 const base=initialState('registration_form'),data={name:'QA Learner',email:'new@example.test',password:'Goodpass1',confirm:'Goodpass1',consent:true}
 assert.ok(Object.keys(simulate(base,{type:'register'},[]).errors).length>=4)
 assert.ok(simulate(base,{type:'register',data:{...data,password:'weak',confirm:'weak'}},[]).errors.password)
 assert.ok(simulate(base,{type:'register',data:{...data,email:'bad'}},[]).errors.email)
 for(const [flag,changed,field]of [
 ['password_confirmation_ignored',{confirm:'Different1'},'confirm'],
 ['consent_not_required',{consent:false},'consent'],
 ['duplicate_email_allowed',{email:'existing@example.test'},'email']]){
  assert.ok(simulate(base,{type:'register',data:{...data,...changed}},[]).errors[field])
  const bug=simulate(base,{type:'register',data:{...data,...changed}},[flag]);assert.equal(bug.view.submitted,1)
 }
 const created=simulate(base,{type:'register',data},[])
 assert.equal(created.view.submitted,1)
 assert.ok(simulate(created.state,{type:'register',data},[]).errors.email)
 const reset=simulate(created.state,{type:'reset'},[]);assert.equal(simulate(reset.state,{type:'register',data},[]).view.submitted,1)
})
test('store search/category/stock/cart math/checkout and toggled behavior are reproducible',()=>{
 const base=initialState('storefront')
 assert.equal(simulate(base,{type:'search',data:{query:'Notebook'}},[]).view.products.length,1)
 assert.equal(simulate(base,{type:'search',data:{query:'Notebook'}},['search_filter_ignored']).view.products.length,3)
 assert.equal(simulate(base,{type:'category',data:{category:'home'}},[]).view.products[0].id,'m1')
 assert.ok(simulate(base,{type:'cart',data:{id:'m1',quantity:1}},[]).errors.quantity)
 assert.equal(simulate(base,{type:'cart',data:{id:'m1',quantity:1}},['stock_limit_ignored']).view.cart.length,1)
 const correct=simulate(base,{type:'cart',data:{id:'n1',quantity:3}},[]);assert.equal(correct.view.total,36)
 const bug=simulate(base,{type:'cart',data:{id:'n1',quantity:3}},['cart_quantity_total_wrong']);assert.equal(bug.view.total,12)
 const checked=simulate(correct.state,{type:'checkout'},[]);assert.equal(checked.view.receipt,'SIM-0001')
 assert.equal(simulate(checked.state,{type:'reset'},[]).view.total,0)
 assert.throws(()=>simulate(base,{type:'cart',data:{id:'n1',quantity:1.5}},[]),/Invalid/)
 const publicJSON=JSON.stringify({view:bug.view,message:bug.message,errors:bug.errors})
 assert.doesNotMatch(publicJSON,/cart_quantity_total_wrong|activeBugs|private_bugs|answer|rubric/)
})

