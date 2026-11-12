const {test}=require('node:test'),assert=require('node:assert/strict')
const path=require('node:path')
const fs=require('node:fs')
const {runInNewContext}=require('node:vm')
const {PHASE_DEVELOPMENT_SERVER,PHASE_PRODUCTION_BUILD,PHASE_PRODUCTION_SERVER}=require('next/constants')

test('Next development output is isolated while build/start share the production directory and download headers',async()=>{
 const configure=(await import('../next.config.mjs')).default
 const dev=configure(PHASE_DEVELOPMENT_SERVER),build=configure(PHASE_PRODUCTION_BUILD),start=configure(PHASE_PRODUCTION_SERVER)
 assert.notEqual(dev.distDir,build.distDir,'Development compilation must never overwrite production chunks')
 assert.equal(build.distDir,start.distDir,'next start must read the directory produced by next build')
 assert.equal(build.distDir,'.next','Keep the existing production deployment path')
 for(const config of [dev,build,start]){
  assert.equal(path.isAbsolute(config.distDir),false)
  assert.ok(!config.distDir.split(/[\\/]/).includes('..'))
 }
 assert.deepEqual(await dev.headers(),await start.headers(),'Download routing must work in either mode')
})

test('App Router waits for HTML parsing and forwards the original hydration arguments',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/lib/next/deferred-app-hydration.cjs'),'utf8')
 for(const readyState of ['loading','interactive','complete']){
  const calls=[]
  const exports={}
  const hooks={}
  let parsed
  runInNewContext(source,{
   exports,
   document:{readyState,addEventListener(event,callback,{once}){
    assert.equal(event,'DOMContentLoaded')
    assert.equal(once,true)
    parsed=callback
   }},
   require(name){
    assert.equal(name,'next/dist/client/app-index.js')
    return {hydrate:(...args)=>calls.push(args)}
   },
  })
  exports.hydrate(hooks)
  if(readyState==='loading'){
   assert.equal(calls.length,0)
   parsed()
  }
  assert.equal(calls.length,1)
  assert.equal(calls[0][0],hooks)
 }
})
