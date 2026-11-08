// Run after building Next.js with the loopback Supabase fixture settings.
const fs = require('node:fs')
const assert = require('node:assert/strict')
const { chromium } = require('@playwright/test')
const origin = 'http://127.0.0.1:3210'
const backend = 'http://127.0.0.1:3211'
const academy = '/en/academy'
const json = async (path, init) => {
  const res = await fetch(backend + path, init)
  assert(res.ok, path + ': ' + res.status)
  return res.json()
}
const median = xs => quantile(xs, 0.5)
const quantile = (xs,q) => xs.length ? [...xs].sort((a,b)=>a-b)[Math.ceil(xs.length*q)-1] : 0
const round = n => Math.round(n*10)/10

async function main() {
  const meta = await json('/__meta')
  const browser = await chromium.launch({ channel: process.env.TESTCRAFT_BENCH_BROWSER || 'chrome' })
  const samples = [], errors = []
  const count = Number(process.env.TESTCRAFT_BENCH_RUNS || 7)
  const lessonPath = academy + '/lessons/' + meta.lesson
  const progressPath = academy + '/progress'
  async function context(user = 2, kind = 'valid') {
    const ctx = await browser.newContext({ viewport:{width:1280,height:900} })
    if (user) {
      const session = await json('/__session?user='+user+(kind==='expired'?'&expired=1':''))
      if (kind === 'forged') session.access_token += 'invalid'
      const cookie = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
      await ctx.addCookies([{ name:'sb-127-auth-token',value:cookie,url:origin,httpOnly:true,sameSite:'Lax' }])
    }
    await ctx.addInitScript(() => {
      window.benchLcp = 0
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.benchLcp = entry.startTime
      }).observe({ type:'largest-contentful-paint', buffered:true })
    })
    return ctx
  }
  async function verify() {
    const open = '/api/academy/lesson-open'
    const data = { lessonId:meta.fresh,hasProgress:false }
    const fresh = academy+'/lessons/'+meta.fresh
    const state = (id=meta.fresh,user=2) => json('/__progress?id='+id+'&user='+user)
    const guest = await context(0)
    for (const url of [academy,fresh]) {
      const response = await guest.request.get(origin+url,{maxRedirects:0})
      assert.equal(response.status(),307)
      assert.match(response.headers().location,/\/en\/login/)
    }
    assert.equal((await guest.request.post(origin+open,{data})).status(),401)
    await guest.close()
    const forged = await context(2,'forged')
    const rejected = await forged.request.get(origin+academy,{maxRedirects:0})
    assert.equal(rejected.status(),307)
    assert.match(rejected.headers().location,/\/en\/login/)
    assert.equal((await forged.request.post(origin+open,{data})).status(),401)
    await forged.close()
    const admin = await context(1)
    assert.equal((await admin.request.post(origin+open,{data})).status(),403)
    assert.match((await admin.request.get(origin+academy,{maxRedirects:0})).headers().location,/\/en\/admin/)
    await admin.close()
    console.log('PASS: guest, forged session and admin access boundaries')

    const ctx = await context(2,'expired'), p = await page(ctx)
    try {
      await json('/__events')
      const prefetch = await ctx.request.get(origin+fresh,{headers:{rsc:'1'}})
      assert.equal(prefetch.status(),200)
      assert.match(prefetch.headers()['content-type'],/text\/x-component/)
      assert((await prefetch.text()).includes('Benchmark lesson 1.7'), 'Authenticated RSC response must include the lesson')
      assert.equal(await state(),null)
      const refreshed = (await json('/__events')).filter(e=>e.path==='/auth/v1/token')
      assert.equal(refreshed.length,1)
      assert.equal(refreshed[0].status,200)
      assert.equal((await ctx.request.post(origin+open,{data,headers:{origin:'https://example.test','x-forwarded-host':'example.test'}})).status(),403)
      assert.equal((await ctx.request.post(origin+open,{data:{...data,userId:'00000000-0000-4000-8000-000000000003'}})).status(),400)

      const opened = p.waitForResponse(r=>r.url().endsWith(open))
      await p.goto(origin+fresh)
      await p.getByRole('heading',{name:'Benchmark lesson 1.7'}).waitFor()
      const openedResponse = await opened
      assert.equal(openedResponse.status(),204, openedResponse.ok() ? '' : await openedResponse.text())
      const first = await state()
      assert.equal(first.status,'in_progress')
      assert.equal(first.completed_at,null)
      const repeated = await Promise.all([
        ctx.request.post(origin+open,{data:{...data,hasProgress:true}}),
        ctx.request.post(origin+open,{data:{...data,hasProgress:true}}),
      ])
      assert(repeated.every(r=>r.status()===204))
      assert.deepEqual(await state(),first)
      await json('/__events')
      await p.reload()
      await p.getByRole('heading',{name:'Benchmark lesson 1.7'}).waitFor()
      await p.waitForTimeout(600)
      assert.equal((await json('/__events')).filter(e=>e.path.endsWith('/lesson_progress')&&['POST','PATCH'].includes(e.method)).length,0)
      assert.deepEqual(await state(),first)
      assert.equal(await state(meta.fresh,3),null)
      console.log('PASS: refresh and RSC prefetch do not write; visible first visit writes once; cooldown and ownership hold')

      await p.getByRole('button',{name:'Mark as Complete'}).click()
      await p.getByRole('link',{name:'Next Lesson',exact:true}).waitFor()
      await p.getByText('Path progress: 2/48',{exact:true}).waitFor()
      const completed = await state()
      assert.equal(completed.status,'completed')
      assert.equal(completed.started_at,first.started_at)
      assert.deepEqual(await json('/__rewards'),{xp:10,awards:1})
      assert.equal((await ctx.request.post(origin+open,{data})).status(),204)
      assert.deepEqual(await state(),completed)
      const stale = await json('/__age-visit?id='+meta.fresh,{method:'POST'})
      assert.equal((await ctx.request.post(origin+open,{data:{...data,hasProgress:true}})).status(),204)
      const touched = await state()
      assert(Date.parse(touched.last_opened_at)>Date.parse(stale.last_opened_at))
      assert.deepEqual({...touched,last_opened_at:completed.last_opened_at},completed)
      await p.goto(origin+fresh.replace('/en/','/ar/'))
      await p.getByRole('heading',{name:'الدرس 1.7'}).waitFor()
      assert.equal(await p.locator('html').getAttribute('dir'),'rtl')
      await p.getByRole('link',{name:'English',exact:true}).click()
      await p.getByRole('heading',{name:'Benchmark lesson 1.7'}).waitFor()
      await p.locator('header a[href="'+progressPath+'"]').click()
      await p.getByText('Completed Lessons',{exact:true}).waitFor()
      await p.getByText(/^Benchmark challenge [1-4]$/).first().waitFor()
      await p.locator('header nav a[href="'+academy+'"]').click()
      await p.getByText('Benchmark module 1',{exact:true}).first().waitFor()
      await p.locator('main nav a[href$="'+meta.otherPath+'"]').click()
      await p.locator('main nav a[aria-current="page"][href$="'+meta.otherPath+'"]').waitFor()
      await p.goto(origin+academy+'/lessons/'+meta.locked)
      await p.getByRole('heading',{name:'Module Locked'}).waitFor()
      assert.equal(await state(meta.locked),null)

      const other = await context(3), o = await page(other)
      try {
        await o.goto(origin+fresh)
        await o.getByRole('button',{name:'Mark as Complete'}).waitFor()
        await o.getByText('Path progress: 0/48',{exact:true}).waitFor()
        assert.equal((await state()).status,'completed')
      } finally { await other.close() }
      assert.deepEqual(errors,[])
      console.log('PASS: lesson completion, single XP award, refreshed navigation, progress, path switch, locked lesson and second-student isolation')
    } finally { await ctx.close() }
  }
  async function page(ctx) {
    const p = await ctx.newPage()
    p.on('pageerror', error => errors.push(error.message))
    p.on('response', response => {
      if (response.url().startsWith(origin+'/api/academy/') && response.status() >= 400) {
        errors.push(response.status()+' '+new URL(response.url()).pathname)
      }
    })
    return p
  }
  async function record(p, name, action, ready, hard) {
    await json('/__events')
    if (!hard) await p.evaluate(()=>performance.clearResourceTimings())
    const start = performance.now()
    await action()
    await ready.waitFor({ timeout:15000 })
    const readyMs = performance.now()-start
    // Give both variants the same window for hydration, activity fetch and speculative work.
    await p.waitForTimeout(900)
    const browserTiming = await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      const sameOrigin = resources.filter(r=>new URL(r.name).origin===location.origin)
      const scripts = sameOrigin.filter(r=>new URL(r.name).pathname.endsWith('.js'))
      return {
        ttfb:nav?.responseStart || 0,
        fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        lcp:window.benchLcp || 0,
        resourceBytes:sameOrigin.reduce((n,r)=>n+r.transferSize,0),
        jsBytes:scripts.reduce((n,r)=>n+r.encodedBodySize,0),
        documentBytes:nav?.transferSize || 0,
        browserRequests:sameOrigin.length,
      }
    })
    const backendRequests = await json('/__events')
    const failures = backendRequests.filter(e=>e.status>=400 && e.status!==406)
    assert.deepEqual(failures,[],name+' fixture errors')
    const sql = backendRequests.filter(e=>e.path.startsWith('/rest/'))
    samples.push({ name, hard, readyMs, ...browserTiming,
      ttfb:hard ? browserTiming.ttfb : null, fcp:hard ? browserTiming.fcp : null, lcp:hard ? browserTiming.lcp : null,
      documentBytes:hard ? browserTiming.documentBytes : 0,
      databaseRequests:sql.length, authRequests:backendRequests.length-sql.length,
      databaseBytes:sql.reduce((n,e)=>n+e.bytes,0),
      databaseMs:sql.reduce((n,e)=>n+e.sqlMs,0), databaseQueryP95:quantile(sql.map(e=>e.sqlMs),0.95),
      databaseRequestP95:quantile(sql.map(e=>e.ms),0.95),
      progressWriteRequests:sql.filter(e=>e.path.endsWith('/lesson_progress') && !['GET','HEAD'].includes(e.method)).length,
      backendRequests,
    })
  }
  try {
    if (process.argv.includes('--verify')) { await verify(); return }
    const warm = await context()
    const w = await page(warm)
    for (const url of [academy,lessonPath,progressPath,academy+'/challenges']) {
      const response = await w.goto(origin+url)
      assert.equal(response.status(),200)
      if (url === lessonPath) {
        let tracked = false
        for (let attempt=0; attempt<20 && !tracked; attempt++) {
          tracked = !!(await json('/__progress?id='+meta.lesson))
          if (!tracked) await w.waitForTimeout(75)
        }
        assert(tracked,'Warm-up visit must persist before timing lesson revisits')
      }
    }
    await warm.close()
    for (let i=0;i<count;i++) {
      for (const [name,url,selector] of [
        ['academy',academy,'text=Benchmark module 1'],
        ['lesson',lessonPath,'h1:has-text("Benchmark lesson 1.2")'],
        ['progress',progressPath,'text=Completed Lessons'],
        ['challenges',academy+'/challenges','text=Benchmark challenge 1'],
      ]) {
        const ctx = await context(), p = await page(ctx)
        try { await record(p,name,()=>p.goto(origin+url,{waitUntil:'domcontentloaded'}),p.locator(selector).first(),true) }
        finally { await ctx.close() }
      }
      const ctx = await context(), p = await page(ctx)
      try {
        await p.goto(origin+academy)
        await p.waitForTimeout(500)
        const lesson = p.locator('main a[href="'+lessonPath+'"]').last()
        await record(p,'academy → lesson',()=>lesson.click(),p.locator('h1:has-text("Benchmark lesson 1.2")'),false)
        await record(p,'lesson → progress',()=>p.locator('header a[href="'+progressPath+'"]').click(),p.getByText('Completed Lessons',{exact:true}),false)
        await p.locator('header nav a[href="'+academy+'"]').click()
        const pathLink = p.locator('main a[href="'+academy+'?path='+meta.otherPath+'"]')
        await pathLink.waitFor()
        await p.waitForTimeout(500)
        await record(p,'path switch',()=>pathLink.click(),p.locator('main nav a[aria-current="page"][href$="'+meta.otherPath+'"]'),false)
      } finally { await ctx.close() }
      console.log('Completed sample ' + (i+1) + '/' + count)
    }
    assert.deepEqual(errors,[])
    const keys = ['readyMs','ttfb','fcp','lcp','documentBytes','resourceBytes','jsBytes','browserRequests','databaseRequests','authRequests','databaseBytes','databaseMs','databaseQueryP95','databaseRequestP95','progressWriteRequests']
    const summary = Object.fromEntries([...new Set(samples.map(s=>s.name))].map(name=>{
      const group = samples.filter(s=>s.name===name)
      return [name,{...Object.fromEntries(keys.map(k=>[k,group[0][k]===null?null:round(median(group.map(s=>s[k])))])),readyP95:round(quantile(group.map(s=>s.readyMs),0.95))}]
    }))
    fs.mkdirSync('.test-output',{recursive:true})
    const output = process.argv[2] || '.test-output/student-perf.json'
    fs.writeFileSync(output,JSON.stringify({browser:browser.version(),latencyMs:meta.latency,runs:count,summary,samples},null,2))
    console.table(summary)
    console.log('Saved '+output)
  } finally { await browser.close() }
}
main().catch(error=>{ console.error(error); process.exitCode=1 })
