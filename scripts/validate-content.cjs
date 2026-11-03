require('./register-ts.cjs')
const fs=require('node:fs')
const {contentBundleSchema}=require('../src/lib/curriculum/content.schema.ts')
const {parseManifestCSV}=require('../src/lib/curriculum/curriculum-manifest.schema.ts')
const b=contentBundleSchema.parse(JSON.parse(fs.readFileSync('content/pilot-bundle.json','utf8').replace(/^\uFEFF/,'')))
const csv=parseManifestCSV(fs.readFileSync('content/verified-manifest.csv','utf8'))
if(JSON.stringify(csv.paths)!==JSON.stringify(b.manifest.paths))throw Error('CSV/JSON inventory differs')
for(const l of b.lessons){
 for(const lang of ['en','ar']){
  const file=fs.readFileSync('content/lessons/'+l.key.split('/').pop()+'.'+lang+'.md','utf8').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim()
  const bundled=l['content_'+lang].replace(/\r\n?/g,'\n').trim()
  if(file!==bundled)throw Error('Stale bundle: '+l.key+'/'+lang)
 }
}
console.log('PASS: '+b.lessons.length+' bilingual lessons; '+b.lessons.reduce((s,l)=>s+l.activities.length,0)+' lesson activities; '+b.module_assessments.length+' module assessments; no publication.')

