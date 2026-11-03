'use client'
import type { Activity } from '@/lib/curriculum/content.schema'
import type { Dictionary } from '@/i18n/types'
const field='w-full rounded-lg border border-border bg-background p-2 text-sm'
export function ActivityEditor({value,onChange,dictionary,language}:{value:Activity[];onChange:(value:Activity[])=>void;dictionary:Dictionary;language:'en'|'ar'}){
 const t=dictionary.factory
 const update=(i:number,part:Partial<Activity>)=>onChange(value.map((a,j)=>i===j?{...a,...part}:a))
 return <div className="space-y-4">
 {value.map((a,i)=><fieldset key={i} className="space-y-3 rounded-xl border border-border p-4">
  <legend className="px-2 text-sm">{t.prompt} {i+1} <bdi className="text-muted-foreground">{a.slug}</bdi></legend>
  <div className="flex flex-wrap gap-2">
   <label className="flex-1 text-sm">{t.kind}<select className={field} value={a.kind} onChange={e=>{
    const kind=e.target.value as Activity['kind'];update(i,{kind,options:kind==='short_answer'?[]:a.options.length?a.options:[{id:'a',text:{en:'Option A',ar:'الخيار أ'}},{id:'b',text:{en:'Option B',ar:'الخيار ب'}}],
    answer:kind==='short_answer'?[]:['a'],rubric:kind==='short_answer'?a.rubric.length?a.rubric:[{en:'Correct reasoning with evidence.',ar:'تفسير صحيح تدعمه الأدلة.'},{en:'Uses the stated scenario conditions.',ar:'يستخدم شروط الموقف المذكورة.'}]:[]})
   }}>{['single_choice','multi_select','true_false','scenario','short_answer'].map(k=><option key={k} value={k}>{({single_choice:language==='ar'?'اختيار واحد':'Single choice',multi_select:language==='ar'?'اختيارات متعددة':'Multiple choice',true_false:language==='ar'?'صحيح أو خطأ':'True / false',scenario:language==='ar'?'قرار في موقف':'Scenario decision',short_answer:language==='ar'?'إجابة مع مراجعة':'Reviewed response'})[k]}</option>)}</select></label>
   <button type="button" className="text-sm text-destructive" onClick={()=>onChange(value.filter((_,j)=>j!==i).map((x,j)=>({...x,sort_order:j+1})))}>{t.remove}</button>
  </div>
  <label className="block text-sm">{t.prompt}<textarea className={field} rows={3} dir={language==='ar'?'rtl':'ltr'} value={a.prompt[language]} onChange={e=>update(i,{prompt:{...a.prompt,[language]:e.target.value}})}/></label>
  {a.options.map((o,j)=><div className="flex items-start gap-2" key={o.id}>
   <label className="flex items-center gap-2 text-sm"><input aria-label={t.answer+' '+o.id} type={a.kind==='multi_select'?'checkbox':'radio'} name={'key-'+i} checked={a.answer.includes(o.id)} onChange={e=>update(i,{answer:a.kind==='multi_select'?(e.target.checked?[...a.answer,o.id]:a.answer.filter(k=>k!==o.id)):[o.id]})}/><bdi>{o.id}</bdi></label>
   <input className={field} aria-label={t.options+' '+o.id} dir={language==='ar'?'rtl':'ltr'} value={o.text[language]} onChange={e=>update(i,{options:a.options.map((p,k)=>j===k?{...p,text:{...p.text,[language]:e.target.value}}:p)})}/>
  </div>)}
  <label className="block text-sm">{t.explanation}<textarea className={field} rows={3} dir={language==='ar'?'rtl':'ltr'} value={a.explanation[language]} onChange={e=>update(i,{explanation:{...a.explanation,[language]:e.target.value}})}/></label>
  {a.kind==='short_answer'&&<label className="block text-sm">{t.rubric}<textarea className={field} rows={3} dir={language==='ar'?'rtl':'ltr'} value={a.rubric.map(r=>r[language]).join('\n')} onChange={e=>update(i,{rubric:e.target.value.split('\n').map((s,j)=>({...a.rubric[j]||{en:'',ar:''},[language]:s}))})}/></label>}
 </fieldset>)}
 {value.length<3&&<button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>onChange([...value,{slug:'check-'+Date.now().toString(36),kind:'single_choice',prompt:{en:'',ar:''},options:[{id:'a',text:{en:'',ar:''}},{id:'b',text:{en:'',ar:''}}],answer:['a'],explanation:{en:'',ar:''},rubric:[],sort_order:value.length+1}])}>{t.addQuestion}</button>}
 </div>
}

