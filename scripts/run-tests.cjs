// Run isolated suites sequentially: parallel WASM compilers can exhaust Windows resources.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path')
const files=process.argv.slice(2)
const suites=files.length?files:fs.readdirSync(path.join(__dirname,'../tests')).filter(n=>n.endsWith('.test.cjs')).sort().map(n=>'tests/'+n)
for(const suite of suites){
 const flags=process.platform==='win32'?['--wasm-num-compilation-tasks=1','--liftoff-only','--no-wasm-async-compilation']:[]
 const result=spawnSync(process.execPath,[...flags,suite],{stdio:'inherit',cwd:path.join(__dirname,'..')})
 if(result.error){console.error(result.error.message);process.exit(1)}
 if(result.status!==0)process.exit(result.status||1)
}
