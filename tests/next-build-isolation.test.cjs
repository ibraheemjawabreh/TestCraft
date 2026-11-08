const {test}=require('node:test'),assert=require('node:assert/strict')
const path=require('node:path')
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
