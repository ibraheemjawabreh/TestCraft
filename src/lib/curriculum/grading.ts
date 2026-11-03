import { z } from 'zod'
import type { Activity } from './content.schema'
export const submissionSchema = z.object({
  activity_id:z.string().uuid(), request_id:z.string().uuid(),
  selected:z.array(z.string().max(60)).max(6).default([]),
  text:z.string().trim().max(5000).default(''),
}).strict()
export function gradeActivity(activity:Activity, selected:string[], text='') {
  if (activity.kind==='short_answer') {
    if (selected.length || text.trim().length<20) throw new Error('Provide a response of at least 20 characters')
    return {status:'needs_review' as const,score:null}
  }
  if (text || new Set(selected).size!==selected.length || !selected.length ||
      selected.some(id=>!activity.options.some(o=>o.id===id)) ||
      (activity.kind!=='multi_select' && selected.length!==1)) throw new Error('Invalid answer selection')
  const correct = selected.length===activity.answer.length && selected.every(x=>activity.answer.includes(x))
  return {status:'graded' as const,score:correct?1:0}
}
// Deliberately construct a public DTO. Never spread private activity/revision rows.
export function publicActivity(row:{id:string; version:number; body:Activity}) {
  const a = row.body
  return {id:row.id,version:row.version,kind:a.kind,prompt:a.prompt,options:a.options,sort_order:a.sort_order}
}

