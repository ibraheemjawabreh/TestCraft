import 'server-only'
import { createHash } from 'node:crypto'
import { flattenManifest, type CurriculumManifest } from './curriculum-manifest.schema'
import { generateLesson, ProviderError, providerConfig, type ProviderConfig } from './provider'
import type { createClient } from '@/lib/supabase/server'
type DB=Awaited<ReturnType<typeof createClient>>
export const fingerprint=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
export function assertDB<T>(r:{data:T;error:{message:string}|null}):NonNullable<T> {
 if(r.error)throw Error(r.error.message)
 return r.data as NonNullable<T>
}
export async function startJob(db:DB,userId:string,manifest:CurriculumManifest,keys:string[],maxRequests:number,maxCost:number,regenerate=false){
 const config=providerConfig()
 const all=flattenManifest(manifest)
 const selected=keys.length?all.filter(l=>keys.includes(l.key)):all
 if(!selected.length||keys.some(k=>!all.some(l=>l.key===k)))throw Error('Unknown/empty selection')
 const imported=assertDB(await db.rpc('curriculum_import',{p_manifest:manifest,p_fingerprint:fingerprint(manifest)}))
 // Repeated clicks reuse an active job for the same source/selection via RPC.
 return assertDB(await db.rpc('curriculum_start_job',{p_source:imported.source_id,p_manifest:manifest,
 p_specs:selected.map(l=>({...l,module_scope:all.filter(x=>x.path_slug===l.path_slug&&x.module_slug===l.module_slug).map(x=>({title_en:x.title_en,title_ar:x.title_ar,objectives_en:x.objectives_en}))})),
 p_requests:maxRequests,p_cost:maxCost,p_config:config,p_regenerate:regenerate}))
}
export async function processJob(db:DB,jobId:string){
 const claim=assertDB(await db.rpc('curriculum_claim',{p_job:jobId}))
 if(!claim)return {processed:false}
 try{
 const {output,actualCost}=await generateLesson(claim.spec,claim.provider_config as ProviderConfig)
 assertDB(await db.rpc('curriculum_finish',{p_item:claim.item_id,p_token:claim.claim_token,p_output:output,p_error:null,p_retry:true,p_actual_cost:actualCost}))
 return {processed:true,status:'needs_review'}
 }catch(error){
 const e=error instanceof ProviderError?error:new ProviderError('Generation failed before persistence',true)
 assertDB(await db.rpc('curriculum_finish',{p_item:claim.item_id,p_token:claim.claim_token,p_output:null,p_error:e.message,p_retry:e.retryable,p_actual_cost:e.actualCost}))
 return {processed:true,status:'failed',retryable:e.retryable}
 }
}



