require('../scripts/register-ts.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')

test('learning handoff only accepts same-locale app destinations', () => {
  const { safeLearningRedirect, studentHomePath, withLearningRedirect } = require('../src/lib/auth/learning-redirect.ts')
  const path = '/ar/academy?path=00000000-0000-4000-8000-000000000001'
  assert.equal(safeLearningRedirect(path,'ar'),path)
  assert.equal(safeLearningRedirect(path + '&next=//example.test','ar'),undefined)
  assert.equal(safeLearningRedirect(studentHomePath('ar'),'ar'),'/ar/academy/home')
  assert.equal(safeLearningRedirect('/en/learning-paths/bench-1','en'),'/en/learning-paths/bench-1')
  assert.equal(safeLearningRedirect('/en/admin','en'),undefined)
  assert.equal(safeLearningRedirect('/en/learning-paths/bench-1/start','en'),'/en/learning-paths/bench-1/start')
  assert.equal(safeLearningRedirect('/ar/learn','ar'),'/ar/learn')
  assert.equal(withLearningRedirect('/auth/post-login?locale=en','/en/learn'),'/auth/post-login?locale=en&redirectTo=%2Fen%2Flearn')
  for (const unsafe of ['https://example.test','//example.test','/ar/learn','/en\\learn','/en/learn\n','/en/learning-paths/%2f/start','/en/academy?path=bad','/en/learn?redirectTo=//example.test']) {
    assert.equal(safeLearningRedirect(unsafe,'en'),undefined,unsafe)
  }
})

test('public metadata and private resume obey publication, prerequisites and ownership', async () => {
  const db = new PGlite()
  const query = async (sql,args) => (await db.query(sql,args)).rows
  const tester = '00000000-0000-4000-8000-000000000002'
  const other = '00000000-0000-4000-8000-000000000003'
  const actor = async (role, uid = '') => {
    await db.exec('reset role; set role '+role)
    await query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  }
  const rpc = async (name, slug) => (await query('select public.'+name+'($1) as data',[slug]))[0].data
  try {
    for (const file of [
      'tests/fixtures/database.sql', 'tests/fixtures/curriculum-deletion-progress.sql',
      ...fs.readdirSync('supabase/migrations').filter(n=>Number(n.slice(0,3))>=20).sort().map(n=>'supabase/migrations/'+n),
      'tests/fixtures/student-perf.sql',
    ]) await db.exec(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))

    const [path] = await query("select id from learning_paths where slug='bench-1'")
    const modules = await query('select id from learning_modules where learning_path_id=$1 order by sort_order',[path.id])
    const lessons = await query('select id from lessons where module_id=$1 order by sort_order',[modules[0].id])
    await query("insert into lessons(learning_path_id,module_id,slug,title_en,content_en,sort_order,is_published) values($1,$2,'private','Private Draft','PRIVATE BODY',0,false)",[path.id,modules[0].id])
    await query("update learning_modules set archived_at=now() where id=$1",[modules[3].id])
    await query("update learning_paths set is_active=false where slug='bench-4'")
    await query('insert into lesson_prerequisites(lesson_id,prerequisite_id) values($1,$2)',[lessons[1].id,lessons[2].id])
    const before = await query('select * from lesson_progress order by user_id,lesson_id')
    await actor('anon')
    const paths = await rpc('curriculum_public_catalog',null)
    assert.equal(paths.length,3)
    assert.deepEqual(paths.map(p=>p.slug),['bench-1','bench-2','bench-3'])
    assert.deepEqual(paths[0].modules,[])
    assert.equal(paths[0].module_count,3)
    assert.equal(paths[0].lesson_count,36)
    const [outline] = await rpc('curriculum_public_catalog','bench-1')
    assert.deepEqual(outline.modules.map(m=>m.id),modules.slice(0,3).map(m=>m.id))
    assert.deepEqual(outline.modules[0].lessons.map(l=>l.id),lessons.map(l=>l.id))
    assert(!JSON.stringify(outline).match(/content_en|PRIVATE BODY|Private Draft|completed_at|user_id/))
    assert.deepEqual(await rpc('curriculum_public_catalog','bench-4'),[])
    await assert.rejects(()=>rpc('curriculum_path_study','bench-1'),/permission denied/)
    await assert.rejects(()=>query('select * from lessons'),/permission denied/)

    await actor('authenticated',tester)
    const initial = await rpc('curriculum_path_study','bench-1')
    assert.equal(initial.lesson_id,lessons[2].id,'Skip the incomplete lesson whose prerequisite is unmet')
    assert.deepEqual(initial.completed,[lessons[0].id])
    assert(!initial.available.includes(lessons[1].id))
    assert.equal(initial.available.length,11,'Only the first module is accessible, minus the prerequisite lock')
    await actor('authenticated',other)
    const independent = await rpc('curriculum_path_study','bench-1')
    assert.deepEqual(independent.completed,[])
    assert.equal(independent.lesson_id,lessons[0].id)
    await db.exec('reset role')
    assert.deepEqual(await query('select * from lesson_progress order by user_id,lesson_id'),before,'Reading or resuming must not record a visit')

    await query("insert into lesson_progress(user_id,lesson_id,status,last_opened_at) values($1,$2,'in_progress',now()-interval '1 hour'),($1,$3,'in_progress',now())",[tester,lessons[3].id,lessons[4].id])
    await actor('authenticated',tester)
    assert.equal((await rpc('curriculum_path_study','bench-1')).lesson_id,lessons[4].id)
    assert.equal((await rpc('curriculum_path_study',null)).lesson_id,lessons[4].id)
  } finally { await db.close() }
})
