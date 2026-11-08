// Run only against a fresh local student-perf-fixture process. This performs
// actual writes to its disposable database and has no hosted configuration.
require('./register-ts.cjs')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { createClient } = require('@supabase/supabase-js')

const backend = 'http://127.0.0.1:3211'
const key = 'testcraft-perf-fixture'
const read = async pathname => {
  const response = await fetch(backend + pathname)
  assert(response.ok, pathname + ': ' + response.status)
  return response.json()
}
const rows = async query => {
  const { data, error } = await query
  assert.equal(error, null, JSON.stringify(error))
  return data
}
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)]
const round = n => Math.round(n*10)/10

async function main() {
  const meta = await read('/__meta')
  const owner = await read('/__session?user=2')
  const other = await read('/__session?user=3')
  const sdk = session => createClient(backend,key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{headers:{Authorization:'Bearer '+session.access_token}},
  })
  const db = sdk(owner)
  const load = Module._load
  Module._load = function(name, ...args) {
    if (name === '@/lib/supabase/server') return { createClient: async () => db }
    return load.call(this,name,...args)
  }
  try {
    const source = process.argv[3] || 'src/lib/academy/services/ProgressService.ts'
    const { completeLessonAndSync, markLessonInProgress } = require(path.resolve(source))
    const module = await rows(db.from('learning_modules').select('id').eq('learning_path_id',meta.path).eq('sort_order',1).single())
    const lessons = await rows(db.from('lessons').select('id,sort_order').eq('module_id',module.id).order('sort_order'))
    assert.equal(lessons.length,12)
    assert.deepEqual(await read('/__rewards'),{xp:0,awards:0},'Start a fresh fixture for every variant')
    const resume = lessons.at(-1).id
    assert.equal((await markLessonInProgress(owner.user.id,resume)).error,null)
    assert.equal((await completeLessonAndSync(other.user.id,lessons[1].id)).error,'Unauthorized')
    const cases = []
    for (const [index,lesson] of lessons.slice(1,8).entries()) {
      assert.equal(await read('/__progress?id='+lesson.id),null)
      for (const kind of ['first','repeat']) {
        await read('/__events')
        const t = performance.now()
        const result = await completeLessonAndSync(owner.user.id,lesson.id)
        const wallMs = performance.now()-t
        assert.deepEqual(result,{data:{moduleCompleted:false,challengeUnlocked:false},error:null})
        const events = await read('/__events')
        assert(events.every(e=>e.status<400),JSON.stringify(events.filter(e=>e.status>=400)))
        const sql = events.filter(e=>e.path.startsWith('/rest/'))
        const state = await read('/__progress?id='+lesson.id)
        assert.equal(state.status,'completed')
        assert(state.completed_at)
        assert.deepEqual(await read('/__rewards'),{xp:(index+1)*10,awards:index+1})
        assert.equal(await read('/__progress?id='+lesson.id+'&user=3'),null)
        assert.deepEqual(await rows(sdk(other).from('lesson_progress').select('lesson_id').eq('user_id',owner.user.id).eq('lesson_id',lesson.id)),[])
        const pathState = await rows(db.from('learning_path_progress').select('completed_modules,completed_lessons,completed_challenges,current_module_id,current_lesson_id')
          .eq('user_id',owner.user.id).eq('learning_path_id',meta.path).single())
        assert.deepEqual(pathState,{completed_modules:0,completed_lessons:index+2,completed_challenges:4,current_module_id:module.id,current_lesson_id:resume})
        cases.push({kind,wallMs,databaseRequests:sql.length,authRequests:events.length-sql.length,
          sqlMs:sql.reduce((n,e)=>n+e.sqlMs,0),responseBytes:sql.reduce((n,e)=>n+e.bytes,0),events})
      }
    }
    const summary = Object.fromEntries(['first','repeat'].map(kind=>{
      const samples = cases.filter(row=>row.kind===kind)
      const metrics = ['wallMs','databaseRequests','authRequests','sqlMs','responseBytes']
      return [kind,Object.fromEntries(metrics.map(metric=>[metric,round(median(samples.map(row=>row[metric])))]))]
    }))
    const output = process.argv[2] || '.test-output/lesson-completion.json'
    fs.writeFileSync(output,JSON.stringify({source,latencyMs:meta.latency,summary,cases},null,2))
    console.table(summary)
    console.log('Saved '+output+'; path pointers, authorization, and exactly-once XP passed.')
  } finally { Module._load = load }
}
main().catch(error=>{console.error(error);process.exitCode=1})
