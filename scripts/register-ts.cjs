const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript')
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename
Module._resolveFilename=function(name,parent,...args){
 if(name.startsWith('@/'))name=path.join(root,'src',name.slice(2))
 if(name==='server-only')return path.join(__dirname,'server-only-test-stub.cjs')
 return resolve.call(this,name,parent,...args)
}
const compile=(module,file)=>{
 const source=fs.readFileSync(file,'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText
 module._compile(output,file)
}


require.extensions['.ts']=compile
require.extensions['.tsx']=compile
