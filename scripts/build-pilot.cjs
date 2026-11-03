require('./register-ts.cjs')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
const {lessonData,assessments}=require('../content/pilot-catalog.cjs')
const {curriculumManifestSchema,flattenManifest}=require('../src/lib/curriculum/curriculum-manifest.schema.ts')
const {contentBundleSchema}=require('../src/lib/curriculum/content.schema.ts')
const source=fs.readFileSync(path.join(root,'src/lib/admin/seeder.ts'),'utf8')
const ast=ts.createSourceFile('seeder.ts',source,ts.ScriptTarget.Latest,true)
let inventory
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='modulesData')inventory=vm.runInNewContext('('+n.initializer.getText(ast)+')',{}, {timeout:1000});ts.forEachChild(n,visit)}
visit(ast)
if(!inventory)throw Error('Verified repository inventory missing')
const clean=(s)=>s.replace(/^\uFEFF/,'')
const ar=(s)=>s.replace(/([\u0600-\u06ff])([A-Za-z0-9])/g,'$1 $2').replace(/([A-Za-z0-9])([\u0600-\u06ff])/g,'$1 $2')
function tidy(x){if(Array.isArray(x))return x.map(tidy);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='ar'&&typeof v==='string'?ar(v):tidy(v)]));return x}
const manifest=curriculumManifestSchema.parse({
 version:1,source:{name:'Verified repository demo inventory',location:'src/lib/admin/seeder.ts @ 100a4fc',
 canonical:false,note:'Exact repository EN titles/slugs/order. Not the missing approved Master Curriculum. Arabic SDLC typo corrected; new objectives authored. No live inventory claim.'},
 paths:[{path_slug:'qa-foundations',title_en:'QA Foundations',title_ar:'أساسيات ضمان الجودة',sort_order:1,
 description_en:'Foundational QA concepts, manual testing and defect reporting using controlled examples.',
 description_ar:'مفاهيم الجودة والاختبار اليدوي وكتابة البلاغات من خلال أمثلة محكومة.',
 modules:inventory.map((m,mi)=>({module_slug:m.slug,title_en:m.title,title_ar:m.title_ar,sort_order:m.sort_order,
 description_en:m.description,description_ar:m.description_ar,practical_challenge_slug:null,
 lessons:m.lessons.map(l=>{const d=lessonData[l.slug];if(!d)throw Error('Authored content missing: '+l.slug)
 return{lesson_slug:l.slug,title_en:l.title,title_ar:l.slug==='sdlc-and-qa'?'دورة حياة تطوير البرمجيات وضمان الجودة':l.title_ar,
 sort_order:l.sort_order,objectives_en:d.objectives.map(o=>o[0]),objectives_ar:d.objectives.map(o=>ar(o[1])),
 prerequisites:[],difficulty:mi===1?'Intermediate':'Beginner'}})}))}]
})
const lessons=flattenManifest(manifest).map(spec=>{
 const d=lessonData[spec.lesson_slug]
 return {key:spec.key,title_en:spec.title_en,title_ar:spec.title_ar,summary_en:d.summary.en,summary_ar:ar(d.summary.ar),
 objectives_en:spec.objectives_en,objectives_ar:spec.objectives_ar,
 content_en:clean(fs.readFileSync(path.join(root,'content/lessons',spec.lesson_slug+'.en.md'),'utf8')).trim(),
 content_ar:clean(fs.readFileSync(path.join(root,'content/lessons',spec.lesson_slug+'.ar.md'),'utf8')).trim(),
 estimated_minutes:d.minutes,previous_key:spec.previous_key,next_key:spec.next_key,is_published:false,
 activities:tidy(d.activities.map((a,i)=>({...a,sort_order:i+1})))}
})
const bundle=contentBundleSchema.parse({version:1,manifest,lessons,module_assessments:inventory.map(m=>({
 module_key:'qa-foundations/'+m.slug,activities:tidy(assessments[m.slug].map((a,i)=>({...a,sort_order:i+1})))
}))})
fs.writeFileSync(path.join(root,'content/verified-manifest.json'),JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(path.join(root,'content/pilot-bundle.json'),JSON.stringify(bundle,null,2)+'\n')
const header=['path_slug','path_title_en','path_title_ar','path_order','path_description_en','path_description_ar',
 'module_slug','module_title_en','module_title_ar','module_order','module_description_en','module_description_ar',
 'lesson_slug','title_en','title_ar','sort_order','objectives_en','objectives_ar','prerequisites','difficulty']
const rows=[header]
for(const p of manifest.paths)for(const m of p.modules)for(const l of m.lessons)rows.push([
 p.path_slug,p.title_en,p.title_ar,p.sort_order,p.description_en,p.description_ar,
 m.module_slug,m.title_en,m.title_ar,m.sort_order,m.description_en,m.description_ar,l.lesson_slug,l.title_en,l.title_ar,
 l.sort_order,l.objectives_en.join('|'),l.objectives_ar.join('|'),l.prerequisites.join('|'),l.difficulty
])
fs.writeFileSync(path.join(root,'content/verified-manifest.csv'),rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n')
const counts={paths:manifest.paths.length,modules:inventory.length,lessons:lessons.length,
 lesson_activities:lessons.reduce((n,l)=>n+l.activities.length,0),
 module_assessments:bundle.module_assessments.length,
 module_questions:bundle.module_assessments.reduce((n,m)=>n+m.activities.length,0),
 linked_challenges:0,published:0,provider_requests:0,spend_usd:0}
fs.writeFileSync(path.join(root,'content/production-counts.json'),JSON.stringify(counts,null,2)+'\n')
console.log(JSON.stringify(counts))
