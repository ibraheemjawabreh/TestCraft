// Resumable one-item ticks use an existing ADMIN session; no service key in CLI arguments.
import fs from 'node:fs'
import {setTimeout as delay} from 'node:timers/promises'
const [origin,jobId,cookieFile]=process.argv.slice(2)
if(!origin||!jobId||!cookieFile)throw Error('Usage: node scripts/curriculum-worker.mjs https://YOUR_HOST JOB_UUID PRIVATE_COOKIE_FILE')
const base=new URL(origin)
if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use HTTPS for remote sessions')
const cookie=fs.readFileSync(cookieFile,'utf8').trim()
const endpoint=new URL('/api/admin/curriculum',base)
async function call(body){
 const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base.origin},body:JSON.stringify(body)})
 const json=await response.json();if(!response.ok)throw Error(json.error||'Worker request failed');return json.data
}
for(let tick=0;tick<10000;tick++){
 await call({action:'tick',job_id:jobId})
 const r=await fetch(endpoint+'?job='+encodeURIComponent(jobId),{headers:{Cookie:cookie},redirect:'error'})
 if(!r.ok)throw Error('Session expired or job unavailable')
 const {data}=await r.json()
 console.log(JSON.stringify({status:data.job.status,requests:data.job.requests,reserved_cost_usd:data.job.reserved_cost_usd,
 completed:data.items.filter(i=>i.status==='completed').length,total:data.items.length}))
 if(!['queued','running'].includes(data.job.status))break
 await delay(2500)
}

