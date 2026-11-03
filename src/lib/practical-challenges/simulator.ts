import 'server-only'
export type SimApp='login_form'|'registration_form'|'storefront'
export type SimState={
 app:SimApp;submitted:number;busy_until:number;signed_in:boolean;emails:string[];
 cart:Record<string,number>;query:string;category:string;receipt:string|null
}
export type SimAction={type:string;data?:Record<string,unknown>}
export const products=[
 {id:'n1',name_en:'Notebook',name_ar:'دفتر',category:'stationery',price:12,stock:10},
 {id:'p1',name_en:'Pen',name_ar:'قلم',category:'stationery',price:3,stock:5},
 {id:'m1',name_en:'Mug',name_ar:'كوب',category:'home',price:20,stock:0},
]
export function initialState(app:SimApp):SimState{return{app,submitted:0,busy_until:0,signed_in:false,emails:['existing@example.test'],cart:{},query:'',category:'all',receipt:null}}
export function publicView(state:SimState,bugs:string[],now:number){
 const list=products.filter(p=>(state.category==='all'||p.category===state.category)&&
  (!state.query||bugs.includes('search_filter_ignored')||(p.name_en+' '+p.name_ar).toLowerCase().includes(state.query.toLowerCase())))
 const cart=Object.entries(state.cart).map(([id,quantity])=>{
  const p=products.find(p=>p.id===id)!
  return{...p,quantity,line_total:p.price*(bugs.includes('cart_quantity_total_wrong')?1:quantity)}
 })
 return{app:state.app,busy:state.busy_until>now&&!bugs.includes('repeated_submission_allowed'),signed_in:state.signed_in,
 submitted:state.submitted,products:list,cart,total:cart.reduce((s,p)=>s+p.line_total,0),receipt:state.receipt,
 query:state.query,category:state.category}
}
export function simulate(state:SimState,action:SimAction,bugs:string[],config:Record<string,unknown>={},now=Date.now()){
 let s:SimState=structuredClone(state);const d=action.data||{}
 let message:{en:string;ar:string}|null=null;const errors:Record<string,{en:string;ar:string}>={}
 const msg=(en:string,ar:string)=>{message={en,ar}}
 const fail=(field:string,en:string,ar:string)=>{errors[field]={en,ar}}
 const email=String(d.email||'').trim(),password=String(d.password||'')
 const min=typeof config.passwordMinLength==='number'?config.passwordMinLength:8
 const validEmail=typeof config.validEmail==='string'?config.validEmail:'qa.tester@testcraft.dev'
 const validPassword=typeof config.validPassword==='string'?config.validPassword:'Test@12345'
 const emailOK=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
 if(action.type==='reset')s=initialState(state.app)
 else if(action.type==='view'){}
 else if(state.app==='login_form'&&action.type==='forgot'){
  if(!bugs.includes('forgot_password_no_action'))msg('If an account exists, recovery instructions will be sent. Simulation only; no email is sent.','إذا كان الحساب موجودًا، فستُرسل تعليمات الاستعادة. محاكاة فقط؛ لا يُرسل بريد.')
 }else if(state.app==='login_form'&&action.type==='login'){
  if(s.busy_until>now&&!bugs.includes('repeated_submission_allowed'))msg('A request is already processing.','يوجد طلب قيد المعالجة.')
  else{
   if(!email)fail('email','Email is required.','البريد الإلكتروني مطلوب.')
   else if(!emailOK&&!bugs.includes('invalid_email_validation_missing'))fail('email','Enter a valid email address.','أدخل صيغة بريد صحيحة.')
   if(!password)fail('password','Password is required.','كلمة المرور مطلوبة.')
   else if(password.length<min&&!bugs.includes('short_password_validation_missing'))fail('password','Password must have at least '+min+' characters.','يجب ألا تقل كلمة المرور عن '+min+' أحرف.')
   if(!Object.keys(errors).length){
    s.submitted++;s.busy_until=now+1200;s.signed_in=email===validEmail&&password===validPassword
    if(s.signed_in)msg('Signed in to the simulation.','تم الدخول إلى المحاكاة.')
    else msg('Invalid credentials.','بيانات الدخول غير صحيحة.')
   }
  }
 }else if(state.app==='registration_form'&&action.type==='register'){
  if(!String(d.name||'').trim())fail('name','Name is required.','الاسم مطلوب.')
  if(!emailOK)fail('email','Enter a valid email address.','أدخل صيغة بريد صحيحة.')
  else if(s.emails.includes(email.toLowerCase())&&!bugs.includes('duplicate_email_allowed'))fail('email','This simulated address is already registered.','هذا العنوان المحاكى مسجل بالفعل.')
  if(password.length<min||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))fail('password','Use at least '+min+' characters with uppercase, lowercase and a number.','استخدم '+min+' أحرف على الأقل مع حرف كبير وصغير ورقم.')
  if(password!==String(d.confirm||'')&&!bugs.includes('password_confirmation_ignored'))fail('confirm','Passwords must match.','يجب تطابق كلمتي المرور.')
  if(d.consent!==true&&!bugs.includes('consent_not_required'))fail('consent','Consent is required.','الموافقة مطلوبة.')
  if(!Object.keys(errors).length){
   s.emails.push(email.toLowerCase());s.submitted++;msg('Simulated account created. No real account or email was created.','أُنشئ الحساب المحاكى. لم يُنشأ حساب حقيقي ولم يُرسل بريد.')
  }
 }else if(state.app==='storefront'&&action.type==='search'){
  s.query=String(d.query||'').slice(0,100)
 }else if(state.app==='storefront'&&action.type==='category'){
  const category=String(d.category)
  if(!['all','stationery','home'].includes(category))throw Error('Unknown category')
  s.category=category
 }else if(state.app==='storefront'&&action.type==='cart'){
  const id=String(d.id),p=products.find(p=>p.id===id),quantity=Number(d.quantity)
  if(!p||!Number.isInteger(quantity)||quantity<0||quantity>100)throw Error('Invalid product quantity')
  if(quantity>p.stock&&!bugs.includes('stock_limit_ignored'))fail('quantity','Requested quantity exceeds available stock.','الكمية المطلوبة تتجاوز المخزون المتاح.')
  else{if(quantity===0)delete s.cart[id];else s.cart[id]=quantity;s.receipt=null;msg('Cart updated.','تم تحديث السلة.')}
 }else if(state.app==='storefront'&&action.type==='checkout'){
  if(!Object.keys(s.cart).length)fail('cart','Add an in-stock item first.','أضف عنصرًا متاحًا أولًا.')
  else{
   s.submitted++;s.receipt='SIM-'+String(s.submitted).padStart(4,'0')
   msg('Simulation confirmed. No payment is collected.','تم التأكيد المحاكى. لا يجري تحصيل أي دفعة.')
  }
 }else throw Error('Action is unavailable for this application')
 return{state:s,view:publicView(s,bugs,now),message,errors}
}

