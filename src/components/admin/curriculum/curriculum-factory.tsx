'use client'
import { useCallback,useEffect,useMemo,useRef,useState } from 'react'
import Link from 'next/link'
import { Upload,Download,Sparkles,Pause,Play,RefreshCw,ShieldCheck,BookOpen } from 'lucide-react'
import type { Dictionary } from '@/i18n/types'
import type { Locale } from '@/i18n/config'
import { curriculumManifestSchema,flattenManifest,parseManifestCSV,type CurriculumManifest } from '@/lib/curriculum/curriculum-manifest.schema'
import type { LessonDraft,Activity } from '@/lib/curriculum/content.schema'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { ActivityEditor } from './activity-editor'
const inputClass='w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm focus:ring-2 focus:ring-primary'
const button='inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed'
async function api(body?:Record<string,unknown>,query=''){
 const r=await fetch('/api/admin/curriculum'+query,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'})
 const json=await r.json();if(!r.ok)throw new Error(JSON.stringify(json));return json.data
}
function download(value:unknown){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}))
 const a=document.createElement('a');a.href=url;a.download='testcraft-master-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url)
}
export function CurriculumFactory({dictionary,locale}:{dictionary:Dictionary;locale:Locale}){
 const t=dictionary.factory
 const [data,setData]=useState<any>({sources:[],jobs:[],versions:[],attempts:[]})
 const [text,setText]=useState(''),[selection,setSelection]=useState<string[]>([])
 const [budget,setBudget]=useState(1),[requests,setRequests]=useState(3),[regenerate,setRegenerate]=useState(false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[details,setDetails]=useState<any>(null)
 const [validated,setValidated]=useState(false),[previewed,setPreviewed]=useState(false)
 const [jobId,setJobId]=useState(''),[jobState,setJobState]=useState<any>(null),[auto,setAuto]=useState(false)
 const [filter,setFilter]=useState('all'),[version,setVersion]=useState<any>(null),[draft,setDraft]=useState<LessonDraft|null>(null)
 const [checkpoint,setCheckpoint]=useState<Activity[]>([])
 const [lang,setLang]=useState<'en'|'ar'>(locale),[dirty,setDirty]=useState(false),[reviewText,setReviewText]=useState<Record<string,string>>({})
 const tickLock=useRef(false),autoOpened=useRef(false)
 const status=(s:string)=>(t.status as Record<string,string>)[s]||s
 const manifest=useMemo(()=>{
  if(!text.trim())return null
  try{let v;try{v=JSON.parse(text)}catch{return parseManifestCSV(text)}
   return curriculumManifestSchema.parse(v.manifest||v)
  }catch{return null}
 },[text])
 const entries=useMemo(()=>manifest?flattenManifest(manifest):[],[manifest])
 const load=useCallback(async()=>{
  const state=await api();setData(state)
  const lesson=new URL(window.location.href).searchParams.get('lesson')
  if(lesson&&!autoOpened.current){autoOpened.current=true;const v=state.versions.find((v:any)=>v.lesson_id===lesson);if(v)await openVersion(v.id)}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[])
 const loadJob=useCallback(async(id:string)=>{
  const state=await api(undefined,'?job='+encodeURIComponent(id));setJobState(state)
  if(!['queued','running'].includes(state.job.status))setAuto(false)
  return state
 },[])
 useEffect(()=>{load().catch(e=>setError(e.message))},[load])
 useEffect(()=>{if(jobId)loadJob(jobId).catch(e=>setError(e.message))},[jobId,loadJob])
 useEffect(()=>{
  if(!auto||!jobId)return
  let alive=true
  const timer=setTimeout(async()=>{
   if(tickLock.current)return;tickLock.current=true
   try{await api({action:'tick',job_id:jobId});if(alive){await loadJob(jobId);await load()}}
   catch(e){if(alive){setError((e as Error).message);setAuto(false)}}
   finally{tickLock.current=false}
  },1500)
  return()=>{alive=false;clearTimeout(timer)}
 },[auto,jobId,jobState,loadJob,load])
 function changeText(s:string){setText(s);setValidated(false);setPreviewed(false);setDetails(null);setSelection([])}
 async function act(action:string,extra:Record<string,unknown>={}){
  setBusy(true);setError('');setNotice('')
  try{
   const result=await api({action,payload:text,selection,max_requests:requests,max_cost_usd:budget,regenerate,...extra})
   if(action==='validate'){setValidated(true);setNotice(t.valid)}
   else if(action==='dry_run')setPreviewed(!result.conflicts?.length)
   else if(action==='export')download(result)
   else setNotice(t.saved)
   setDetails(result)
   if(action==='start'){setJobId(result.job_id);setAuto(true)}
   await load()
   if(jobId)await loadJob(jobId)
   return result
  }catch(e){setError((e as Error).message);return null}
  finally{setBusy(false)}
 }
 async function openVersion(id:string){
  setError('')
  try{const result=await api(undefined,'?version='+id);setVersion(result.version);setDraft(result.version.body);setDirty(false)
   const latest=new Map<string,any>()
   for(const a of result.activities.filter((a:any)=>!a.lesson_id))if(!latest.has(a.slug))latest.set(a.slug,a)
   setCheckpoint([...latest.values()].map(a=>a.body).sort((a,b)=>a.sort_order-b.sort_order))}
  catch(e){setError((e as Error).message)}
 }
 function toggle(keys:string[]){
  setPreviewed(false)
  setSelection(prev=>keys.every(k=>prev.includes(k))?prev.filter(k=>!keys.includes(k)):[...new Set([...prev,...keys])])
 }
 const toggleGroup=(keys:string[],label:string)=><label className="inline-flex items-center gap-2 font-medium"><input type="checkbox" checked={keys.length>0&&keys.every(k=>selection.includes(k))} onChange={()=>toggle(keys)}/><span>{label}</span></label>
 const counts=jobState?.items.reduce((a:Record<string,number>,i:any)=>({...a,[i.status]:(a[i.status]||0)+1}),{})||{}
 const complete=(counts.completed||0)+(counts.skipped||0)+(counts.needs_review||0)
 const updateDraft=(field:keyof LessonDraft,value:any)=>{setDraft(d=>d?{...d,[field]:value}:d);setDirty(true)}
 const visibleVersions=data.versions.filter((v:any)=>filter==='all'||(filter==='published'?v.lessons?.is_published:v.status===filter))
 return <section className="space-y-6 rounded-2xl border border-primary/25 bg-card/60 p-4 sm:p-6" dir={locale==='ar'?'rtl':'ltr'}>
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles className="h-5 w-5 text-primary"/>{t.title}</h2><p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p></div>
   <button className={button} disabled={busy} onClick={()=>act('export')}><Download className="h-4 w-4"/>{t.export}</button>
  </div>
  {(!manifest||!manifest.source.canonical)&&<p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">{t.missing}</p>}
  {error&&<div role="alert" className="rounded-lg border border-destructive/40 p-3"><p>{t.failed}</p><pre dir="ltr" className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{error}</pre></div>}
  {notice&&<p role="status" className="text-sm text-emerald-500">{notice}</p>}
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="space-y-1 text-sm">{t.file}<input className={inputClass} type="file" accept=".json,.csv" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>5_000_000){setError('5 MB');return}changeText(await file.text())}}}/></label>
   <label className="space-y-1 text-sm">{t.source}<select className={inputClass} value="" onChange={e=>{const src=data.sources.find((s:any)=>s.id===e.target.value);if(src)changeText(JSON.stringify(src.manifest,null,2))}}><option value="">{t.selection}</option>{data.sources.map((s:any)=><option key={s.id} value={s.id}>{s.manifest.source.name}</option>)}</select></label>
  </div>
  <button className={button} disabled={busy} onClick={async()=>{try{changeText(JSON.stringify(await api(undefined,'?pilot=true'),null,2))}catch(e){setError((e as Error).message)}}}><BookOpen className="h-4 w-4"/>{t.loadPilot}</button>
  <label className="block space-y-1 text-sm">{t.payload}<textarea dir="ltr" spellCheck={false} className={inputClass+' font-mono text-xs'} rows={6} value={text} onChange={e=>changeText(e.target.value)}/></label>
  <div className="flex flex-wrap gap-2">
   <button className={button} disabled={busy||!text} onClick={()=>act('validate')}><ShieldCheck className="h-4 w-4"/>{t.validate}</button>
   <button className={button} disabled={busy||!validated} onClick={()=>act('dry_run')}>{t.dryRun}</button>
   <button className={button+' border-primary/50 text-primary'} disabled={busy||!validated||!previewed} onClick={()=>act('import')}><Upload className="h-4 w-4"/>{t.importDrafts}</button>
  </div>
  {details&&<details className="rounded-lg border p-3" open><summary className="cursor-pointer text-sm">{t.details}</summary><pre dir="ltr" className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(details,null,2)}</pre></details>}
  {manifest&&<div className="space-y-3">
   <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">{t.selection} ({selection.length}/{entries.length})</h3>
    <button className="text-sm text-primary" onClick={()=>setSelection(entries.map(l=>l.key))}>{t.selectAll}</button><button className="text-sm text-muted-foreground" onClick={()=>setSelection([])}>{t.clear}</button></div>
   <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3">{manifest.paths.map(p=><details key={p.path_slug} open>
    <summary className="cursor-pointer p-2">{toggleGroup(entries.filter(l=>l.path_slug===p.path_slug).map(l=>l.key),locale==='ar'?p.title_ar:p.title_en)}</summary>
    {p.modules.map(m=><div key={m.module_slug} className="ms-4 border-s ps-3 py-2">
     {toggleGroup(entries.filter(l=>l.path_slug===p.path_slug&&l.module_slug===m.module_slug).map(l=>l.key),locale==='ar'?m.title_ar:m.title_en)}
     {entries.filter(l=>l.path_slug===p.path_slug&&l.module_slug===m.module_slug).map(l=><label key={l.key} className="ms-4 mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={selection.includes(l.key)} onChange={()=>toggle([l.key])}/><span>{locale==='ar'?l.title_ar:l.title_en}</span></label>)}
    </div>)}
   </details>)}</div>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">{t.requests}<input className={inputClass} type="number" min={1} max={10000} value={requests} onChange={e=>{setRequests(Number(e.target.value));setPreviewed(false)}}/></label>
    <label className="text-sm">{t.budget}<input className={inputClass} type="number" min={0.01} step={0.01} max={10000} value={budget} onChange={e=>{setBudget(Number(e.target.value));setPreviewed(false)}}/></label>
   </div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={regenerate} onChange={e=>setRegenerate(e.target.checked)}/>{t.regenerate}</label>
   <button className={button+' bg-primary text-primary-foreground'} disabled={busy||!validated||!previewed||!selection.length} onClick={()=>act('start')}><Sparkles className="h-4 w-4"/>{t.generate}</button>
  </div>}
  <div className="space-y-3 border-t pt-5">
   <h3 className="font-semibold">{t.progress}</h3><p className="text-xs text-muted-foreground">{t.browser}</p>
   {data.jobs.length?<select aria-label={t.progress} className={inputClass} value={jobId} onChange={e=>{setJobId(e.target.value);setAuto(false)}}><option value="">{t.selection}</option>{data.jobs.map((j:any)=><option key={j.id} value={j.id}>{status(j.status)} · {new Date(j.created_at).toLocaleString(locale)}</option>)}</select>:<p className="text-sm text-muted-foreground">{t.emptyJobs}</p>}
   {jobState&&<div className="space-y-3">
    <div aria-live="polite" className="flex flex-wrap gap-3 text-sm"><strong>{status(jobState.job.status)}</strong><span>{t.completed}: {counts.completed||0}</span><span>{t.skipped}: {counts.skipped||0}</span><span>{t.failedItems}: {counts.failed||0}</span><span>{t.total}: {jobState.items.length}</span></div>
    <progress aria-label={t.progress} className="h-2 w-full" value={complete} max={jobState.items.length||1}/>
    <p className="text-sm"><bdi>{jobState.job.requests}/{jobState.job.max_requests}</bdi> · {t.reserved}: <bdi>{jobState.job.reserved_cost_usd} / {jobState.job.max_cost_usd}</bdi> · {t.actual}: <bdi>{jobState.job.actual_cost_usd}</bdi></p>
    <div className="flex flex-wrap gap-2">
     <button className={button} disabled={!['queued','running'].includes(jobState.job.status)||auto} onClick={()=>setAuto(true)}><Play className="h-4 w-4"/>{t.run}</button>
     <button className={button} disabled={busy} onClick={()=>{setAuto(false);act('pause',{job_id:jobId})}}><Pause className="h-4 w-4"/>{t.pause}</button>
     <button className={button} disabled={busy||!['paused','failed'].includes(jobState.job.status)} onClick={async()=>{if(await act('resume',{job_id:jobId}))setAuto(true)}}>{t.resume}</button>
     <button className={button} onClick={()=>loadJob(jobId).catch(e=>setError(e.message))}><RefreshCw className="h-4 w-4"/>{t.refresh}</button>
    </div>
    <div className="max-h-56 overflow-auto text-sm">{jobState.items.map((i:any)=><div key={i.id} className="border-b py-2"><bdi>{i.lesson_key}</bdi> · {status(i.status)} · {i.attempts}{i.error&&<p className="text-destructive">{i.error}</p>}</div>)}</div>
   </div>}
  </div>
  <div className="space-y-3 border-t pt-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{t.review}</h3><select aria-label={t.filter} className="rounded-lg border bg-background p-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}>{['all','needs_review','applied','published'].map(s=><option key={s} value={s}>{s==='all'?t.all:status(s)}</option>)}</select></div>
   <div className="max-h-56 space-y-2 overflow-auto">{visibleVersions.length?visibleVersions.map((v:any)=><button key={v.id} className={button+' w-full justify-between text-start'} onClick={()=>openVersion(v.id)}><span>{v.lessons?.[locale==='ar'?'title_ar':'title_en']}</span><span className="text-xs text-muted-foreground">{status(v.lessons?.is_published?'published':v.status)}</span></button>):<p className="text-sm text-muted-foreground">{t.emptyVersions}</p>}</div>
  </div>
  {draft&&version&&<div className="space-y-4 rounded-xl border border-primary/30 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{draft[lang==='en'?'title_en':'title_ar']}</h3><select aria-label={t.language} className="rounded border bg-background p-2" value={lang} onChange={e=>setLang(e.target.value as 'en'|'ar')}><option value="en">English</option><option value="ar">العربية</option></select></div>
   <label className="block text-sm">{t.summary}<textarea className={inputClass} dir={lang==='ar'?'rtl':'ltr'} value={draft[lang==='en'?'summary_en':'summary_ar']} onChange={e=>updateDraft(lang==='en'?'summary_en':'summary_ar',e.target.value)}/></label>
   <label className="block text-sm">{t.objectives}<textarea className={inputClass} dir={lang==='ar'?'rtl':'ltr'} value={draft[lang==='en'?'objectives_en':'objectives_ar'].join('\n')} onChange={e=>updateDraft(lang==='en'?'objectives_en':'objectives_ar',e.target.value.split('\n'))}/></label>
   <label className="block text-sm">{t.minutes}<input className={inputClass} type="number" min={5} max={18} value={draft.estimated_minutes} onChange={e=>updateDraft('estimated_minutes',Number(e.target.value))}/></label>
   <label className="block text-sm">{t.content}<textarea className={inputClass+' font-mono'} dir={lang==='ar'?'rtl':'ltr'} rows={14} value={draft[lang==='en'?'content_en':'content_ar']} onChange={e=>updateDraft(lang==='en'?'content_en':'content_ar',e.target.value)}/></label>
   <div className="grid gap-4 lg:grid-cols-2">
    <details className="min-w-0 rounded-lg border p-3"><summary className="cursor-pointer text-sm">{t.current}</summary><MarkdownRenderer dir={lang==='ar'?'rtl':'ltr'} content={version.lessons?.[lang==='en'?'content_en':'content_ar']||''}/></details>
    <details open className="min-w-0 rounded-lg border p-3"><summary className="cursor-pointer text-sm">{t.proposed}</summary><MarkdownRenderer dir={lang==='ar'?'rtl':'ltr'} content={draft[lang==='en'?'content_en':'content_ar']}/></details>
   </div>
   <details><summary className="mb-3 cursor-pointer font-medium">{t.reviewQuestions}</summary><ActivityEditor value={draft.activities} onChange={a=>updateDraft('activities',a)} dictionary={dictionary} language={lang}/></details>
   {!!checkpoint.length&&<details><summary className="mb-3 cursor-pointer font-medium">{t.moduleAssessment}</summary>
    <ActivityEditor value={checkpoint} onChange={setCheckpoint} dictionary={dictionary} language={lang}/>
    <button className={button+' mt-3'} disabled={busy} onClick={()=>act('edit_assessment',{module_id:version.lessons.module_id,payload:checkpoint})}>{t.saveRevision}</button>
   </details>}
   <div className="flex flex-wrap gap-2">
    <button className={button} disabled={busy||!dirty} onClick={async()=>{const r=await act('edit_revision',{version_id:version.id,payload:draft});if(r?.id)await openVersion(r.id)}}>{t.saveRevision}</button>
    <button className={button} disabled={busy||dirty||version.status==='applied'||version.lessons?.is_published} onClick={async()=>{if(window.confirm(t.confirmApply)){const r=await act('apply',{version_id:version.id,expected_updated:version.base_updated_at,acknowledged:true});if(r)await openVersion(version.id)}}}>{t.apply}</button>
    <button className={button+' border-primary/50 text-primary'} disabled={busy||dirty||version.status!=='applied'||version.lessons?.is_published} onClick={async()=>{if(window.confirm(t.confirmPublish)){await act('publish',{lesson_id:version.lesson_id,acknowledged:true});await openVersion(version.id)}}}>{t.publish}</button>
    <Link className={button} href={'/'+locale+'/admin/lessons/'+version.lesson_id+'/edit'}>{t.editStudio}</Link>
   </div>
  </div>}
  <div className="space-y-3 border-t pt-5"><h3 className="font-semibold">{t.pendingReview}</h3>
   {!data.attempts.length&&<p className="text-sm text-muted-foreground">{t.noAttempts}</p>}
   {data.attempts.map((a:any)=><div key={a.id} className="space-y-2 rounded-lg border p-3">
    <p className="font-medium">{a.lesson_activities?.body.prompt[locale]}</p><p className="whitespace-pre-wrap text-sm">{a.response.text}</p>
    <ul className="list-inside list-disc text-sm text-muted-foreground">{a.lesson_activities?.body.rubric.map((r:any,i:number)=><li key={i}>{r[locale]}</li>)}</ul>
    <label className="block text-sm">{t.reviewFeedback}<textarea className={inputClass} value={reviewText[a.id]||''} onChange={e=>setReviewText(s=>({...s,[a.id]:e.target.value}))}/></label>
    {[1,0].map(score=><button key={score} className={button+' me-2'} disabled={busy||(reviewText[a.id]||'').length<10} onClick={()=>act('review_attempt',{attempt_id:a.id,score,feedback:reviewText[a.id]})}>{score?t.accept:t.reject}</button>)}
   </div>)}
  </div>
 </section>
}

