'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {Locale} from '@/i18n/config'
import type {Dictionary} from '@/i18n/types'
import {factoryAr,factoryEn} from '@/i18n/factory'
type Props={appKey:string|null;config:Record<string,unknown>|null;activeBugs?:string[];challengeId?:string;locale?:Locale;dictionary?:Dictionary}
const field='w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary'
const button='rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium hover:bg-primary/10 disabled:opacity-40'
export function PracticalAppRenderer({appKey,config,activeBugs,challengeId,locale='en',dictionary}:Props){
 const t=dictionary?.factory.lab||(locale==='ar'?factoryAr.lab:factoryEn.lab)
 const [view,setView]=useState<any>(null),[message,setMessage]=useState<any>(null),[errors,setErrors]=useState<Record<string,any>>({}),[error,setError]=useState(''),[network,setNetwork]=useState(false)
 const [form,setForm]=useState<Record<string,any>>({}),[quantities,setQuantities]=useState<Record<string,number>>({})
 const previewState=useRef<unknown>(null)
 const signature=JSON.stringify({appKey,config,activeBugs,challengeId})
 const call=useCallback(async(type:string,data:Record<string,unknown>={})=>{
  setNetwork(true);setError('')
  try{
   const preview=!challengeId
   const payload=preview?{app:appKey,config:config||{},bugs:activeBugs||[],state:previewState.current,action:{type,data}}
    :{challenge_id:challengeId,request_id:crypto.randomUUID(),action:{type,data}}
   const r=await fetch(preview?'/api/admin/practical-preview':'/api/academy/lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   const json=await r.json();if(!r.ok)throw Error(json.error||t.connectionError)
   const result=json.data;if(preview)previewState.current=result.state
   setView(result.view);setMessage(result.message);setErrors(result.errors||{})
   if(type==='reset'){setForm({});setQuantities({})}
  }catch(e){setError((e as Error).message)}finally{setNetwork(false)}
 // signature tracks admin preview edits; state itself is kept in a ref.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature,t.connectionError])
 useEffect(()=>{previewState.current=null;setView(null);call('view')},[call])
 useEffect(()=>{
  if(!view?.busy)return
  const timer=setTimeout(()=>call('view'),1350)
  return()=>clearTimeout(timer)
 },[view,call])
 function control(key:string,label:string,type='text'){
  return <label className="block space-y-1 text-sm" key={key}><span>{label}</span>
   <input aria-label={label} className={field} type={type} value={form[key]||''} onChange={e=>setForm(s=>({...s,[key]:e.target.value}))} autoComplete="off" dir={key==='email'||key==='password'||key==='confirm'?'ltr':undefined}/>
   {errors[key]&&<span role="alert" className="text-xs text-destructive">{errors[key][locale]}</span>}
  </label>
 }
 if(!['login_form','registration_form','storefront'].includes(appKey||''))return <p role="status">{t.connectionError}</p>
 return <section className="space-y-5 rounded-xl border border-border/60 bg-secondary/10 p-4 sm:p-6" dir={locale==='ar'?'rtl':'ltr'} aria-label={t.title}>
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{t.title}</h3><p className="mt-1 text-xs text-muted-foreground">{t.simulation}</p></div>
   <button className={button} disabled={network} onClick={()=>call('reset')}>{t.reset}</button>
  </div>
  <details open className="rounded-lg border border-primary/20 p-3 text-sm"><summary className="cursor-pointer font-medium">{t.requirements}</summary>
   <p className="mt-2 leading-relaxed">{appKey==='login_form'?t.loginRules.replace('8',String(config?.passwordMinLength||8)):appKey==='registration_form'?t.registrationRules:t.storeRules}</p>
   {appKey==='login_form'&&<p className="mt-2"><bdi>{String(config?.validEmail||'qa.tester@testcraft.dev')}</bdi> · <bdi>{String(config?.validPassword||'Test@12345')}</bdi></p>}
  </details>
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{t.connectionError}</p><p>{error}</p><button className={button} onClick={()=>call('view')}>{t.refresh}</button></div>}
  {message&&<p role="status" aria-live="polite" className="rounded-lg border border-primary/20 p-3 text-sm">{message[locale]}</p>}
  {(appKey==='login_form'||appKey==='registration_form')&&<form noValidate onSubmit={e=>{e.preventDefault();call(appKey==='login_form'?'login':'register',form)}} className="mx-auto max-w-md space-y-4">
   {appKey==='registration_form'&&control('name',t.name)}
   {control('email',t.email,'text')}
   {control('password',t.password,'password')}
   {appKey==='registration_form'&&<>
    {control('confirm',t.confirm,'password')}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.consent} onChange={e=>setForm(s=>({...s,consent:e.target.checked}))}/>{t.consent}</label>
    {errors.consent&&<p role="alert" className="text-sm text-destructive">{errors.consent[locale]}</p>}
   </>}
   <button type="submit" className={button+' w-full bg-primary/10'} disabled={network||!!view?.busy}>{appKey==='login_form'?t.login:t.register}{view?.busy?'…':''}</button>
   {appKey==='login_form'&&<button type="button" className="text-sm text-primary underline underline-offset-4" disabled={network} onClick={()=>call('forgot',{email:form.email||''})}>{t.forgot}</button>}
  </form>}
  {appKey==='storefront'&&view&&<div className="space-y-4">
   <div className="grid gap-3 sm:grid-cols-2"><form onSubmit={e=>{e.preventDefault();call('search',{query:form.query||''})}} className="flex items-end gap-2">
    <label className="flex-1 text-sm">{t.search}<input aria-label={t.search} className={field} value={form.query||''} onChange={e=>setForm(s=>({...s,query:e.target.value}))}/></label><button className={button} disabled={network}>{t.search}</button>
   </form>
   <label className="text-sm">{t.category}<select aria-label={t.category} className={field} value={view.category} onChange={e=>call('category',{category:e.target.value})}><option value="all">{t.all}</option><option value="stationery">{t.stationery}</option><option value="home">{t.home}</option></select></label></div>
   <div className="grid gap-3 sm:grid-cols-2">{view.products.map((p:any)=><div key={p.id} className="space-y-2 rounded-xl border bg-background/50 p-4">
    <h4 className="font-semibold">{p[locale==='ar'?'name_ar':'name_en']}</h4><p className="text-sm"><bdi>{p.price}</bdi> · {t.stock}: <bdi>{p.stock}</bdi></p>
    <form className="flex items-end gap-2" onSubmit={e=>{e.preventDefault();call('cart',{id:p.id,quantity:quantities[p.id]??1})}}>
     <label className="flex-1 text-sm">{t.quantity}<input aria-label={t.quantity+' '+p.id} className={field} type="number" min={0} max={100} value={quantities[p.id]??1} onChange={e=>setQuantities(s=>({...s,[p.id]:Number(e.target.value)}))}/></label>
     <button className={button} disabled={network}>{t.update}</button>
    </form>
   </div>)}</div>
   {errors.quantity&&<p role="alert" className="text-sm text-destructive">{errors.quantity[locale]}</p>}
   <div className="space-y-2 rounded-xl border p-4"><h4 className="font-semibold">{t.cart}</h4>
    {!view.cart.length&&<p className="text-sm">{t.emptyCart}</p>}
    {view.cart.map((p:any)=><p className="text-sm" key={p.id}>{p[locale==='ar'?'name_ar':'name_en']} · <bdi>{p.quantity} × {p.price} = {p.line_total}</bdi></p>)}
    <p className="font-semibold">{t.total}: <bdi data-testid="cart-total">{view.total}</bdi></p>
    <button className={button} disabled={network} onClick={()=>call('checkout')}>{t.checkout}</button>
    {view.receipt&&<p role="status">{t.receipt}: <bdi>{view.receipt}</bdi></p>}
    {errors.cart&&<p role="alert">{errors.cart[locale]}</p>}
   </div>
  </div>}
  {view&&<p className="text-xs text-muted-foreground">{t.submissions}: <bdi>{view.submitted}</bdi>{view.signed_in?' · '+t.signedIn:''}</p>}
 </section>
}

