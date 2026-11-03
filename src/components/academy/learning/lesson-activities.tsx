'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import type {Dictionary} from '@/i18n/types'
type Pair={en:string;ar:string}
type Question={id:string;version:number;kind:string;prompt:Pair;options:{id:string;text:Pair}[];module_assessment:boolean}
type Attempt={id:string;activity_id:string;status:string;score:number|null;feedback:{explanation?:Pair;rubric?:Pair[]};review_feedback?:string;created_at?:string}
const button='rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium hover:bg-primary/10 disabled:opacity-40'
export function LessonActivities({lessonId,locale,dictionary}:{lessonId:string;locale:'en'|'ar';dictionary:Dictionary}){
 const [questions,setQuestions]=useState<Question[]>([]),[attempts,setAttempts]=useState<Attempt[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const t=dictionary.factory
 const load=useCallback(async()=>{
  try{setError('');const r=await fetch('/api/academy/activities?lesson='+lessonId,{cache:'no-store'});const json=await r.json()
   if(!r.ok)throw Error(json.error||t.failed)
   setQuestions(json.data.activities);setAttempts(json.data.attempts)
  }catch(e){setError((e as Error).message)}finally{setLoading(false)}
 },[lessonId,t.failed])
 useEffect(()=>{load()},[load])
 return <section className="space-y-4" dir={locale==='ar'?'rtl':'ltr'} aria-label={t.questions}>
  <h2 className="text-xl font-bold">{t.questions}</h2>
  {loading&&<p role="status">{t.loading}</p>}
  {error&&<div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3"><p>{t.failed}</p><p className="text-xs text-muted-foreground">{error}</p><button className={button} onClick={load}>{t.retry}</button></div>}
  {!loading&&!error&&!questions.length&&<p className="text-sm text-muted-foreground">{t.noQuestions}</p>}
  {questions.map(q=><KnowledgeCheck key={q.id} question={q} attempts={attempts.filter(a=>a.activity_id===q.id)} dictionary={dictionary} locale={locale} onSubmitted={a=>setAttempts(prev=>[a,...prev.filter(x=>x.id!==a.id)])}/>)}
 </section>
}
function KnowledgeCheck({question:q,attempts,dictionary,locale,onSubmitted}:{question:Question;attempts:Attempt[];dictionary:Dictionary;locale:'en'|'ar';onSubmitted:(a:Attempt)=>void}){
 const t=dictionary.factory
 const [selected,setSelected]=useState<string[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [result,setResult]=useState<Attempt|null>(attempts[0]||null)
 const request=useRef<string|null>(null)
 const short=q.kind==='short_answer'
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('')
  request.current ||= crypto.randomUUID()
  try{
   const r=await fetch('/api/academy/activities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({activity_id:q.id,request_id:request.current,selected,text})})
   const json=await r.json();if(!r.ok)throw Error(json.error||t.failed)
   const a={...json.data,activity_id:q.id};setResult(a);onSubmitted(a)
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-5">
  {q.module_assessment&&<p className="text-xs font-medium text-primary">{t.moduleAssessment}</p>}
  <form onSubmit={submit} className="space-y-3">
   <fieldset disabled={busy||!!result} className="space-y-3">
    <legend className="mb-3 font-semibold">{q.prompt[locale]}</legend>
    {short?<label className="block space-y-2 text-sm"><span>{t.shortAnswer}</span><textarea className="w-full rounded-lg border bg-background p-3" rows={5} minLength={20} maxLength={5000} required value={text} onChange={e=>{setText(e.target.value);request.current=null}}/></label>
    :q.options.map(o=><label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 p-3 text-sm hover:bg-secondary/40">
     <input type={q.kind==='multi_select'?'checkbox':'radio'} name={q.id} value={o.id} checked={selected.includes(o.id)} onChange={e=>{
      request.current=null;setSelected(q.kind==='multi_select'?(e.target.checked?[...selected,o.id]:selected.filter(x=>x!==o.id)):[o.id])
     }}/><span>{o.text[locale]}</span>
    </label>)}
   </fieldset>
   {!result&&<button className={button} disabled={busy||(!short&&!selected.length)} type="submit">{busy?t.loading:t.submit}</button>}
  </form>
  {error&&<p role="alert" className="text-sm text-destructive">{t.failed} {error}</p>}
  {result&&<div role="status" aria-live="polite" className="space-y-2 border-t pt-3 text-sm">
   <p className="font-medium">{result.status==='needs_review'?t.needsReview:result.score===1?t.correct:t.incorrect}</p>
   {result.feedback?.explanation&&<p>{result.feedback.explanation[locale]}</p>}
   {result.review_feedback&&<p>{result.review_feedback}</p>}
   {result.feedback?.rubric&&<ul className="list-inside list-disc">{result.feedback.rubric.map((r,i)=><li key={i}>{r[locale]}</li>)}</ul>}
   <button className={button} onClick={()=>{setResult(null);setSelected([]);setText('');request.current=null}}>{t.retry}</button>
  </div>}
  {!!attempts.length&&<details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t.history} ({attempts.length})</summary>
   <ul className="mt-2 space-y-1">{attempts.slice(0,10).map(a=><li key={a.id}>{(t.status as Record<string,string>)[a.status]||a.status}{a.score!==null?' · '+a.score+'/1':''}{a.created_at?' · '+new Date(a.created_at).toLocaleString(locale):''}</li>)}</ul>
  </details>}
 </div>
}

