// Production Next.js + the loopback student fixture, never a hosted account.
const { chromium } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const app = 'http://127.0.0.1:3210'
const backend = 'http://127.0.0.1:3211'
const json = async (path, init) => {
  const response = await fetch(backend+path,init)
  assert(response.ok,path+': '+response.status)
  return response.json()
}
const med = a => [...a].sort((x,y)=>x-y)[Math.floor(a.length/2)]
const round = n => Math.round(n*10)/10
const details = '/en/learning-paths/bench-1'
const suite = [
  ['home','/en'],
  ['listing','/en/learning-paths'],
  ['detail',details],
]

async function browserChecks(browser) {
  const meta = await json('/__meta')
  const dir = '.test-output/phase2-screenshots'
  fs.mkdirSync(dir,{recursive:true})
  const guest = await browser.newContext({ viewport:{width:1440,height:1000},reducedMotion:'reduce' })
  const page = await guest.newPage()
  const ready = async name => page.getByRole('heading',{name,level:1,exact:true}).waitFor({timeout:15000})
  const status = url => guest.request.get(app+url,{maxRedirects:0})
  const state = (id,user) => json('/__progress?id='+id+'&user='+user)
  const noWrites = async () => assert.equal((await json('/__events')).filter(e=>e.path.endsWith('/lesson_progress') && ['POST','PATCH','DELETE'].includes(e.method)).length,0)
  try {
    await json('/__events')
    assert.equal((await page.goto(app+'/en')).status(),200)
    await page.getByText('by doing QA.',{exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'Account menu',exact:true}).count(),0)
    await page.getByRole('button',{name:'Empty password',exact:true}).click()
    await page.getByText('Failed',{exact:true}).waitFor()
    assert.equal(await page.getByRole('button',{name:'Empty password',exact:true}).getAttribute('aria-pressed'),'true')
    await page.getByRole('button',{name:'Valid credentials',exact:true}).click()
    await page.getByText('Passed',{exact:true}).waitFor()
    await page.screenshot({path:dir+'/home-en.png',fullPage:true})
    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Learning Paths',exact:true}).click()
    await ready('Find your learning path.')
    assert.equal(await page.getByRole('link',{name:/^View Path:/}).count(),4)
    await page.screenshot({path:dir+'/catalog-en.png',fullPage:true})
    await page.getByRole('link',{name:'View Path: Benchmark path 1',exact:true}).click()
    await ready('Benchmark path 1')
    assert.equal(await page.getByText('48 Lessons',{exact:true}).count(),1)
    const modules = await page.locator('details summary strong').allTextContents()
    assert.deepEqual(modules,['Benchmark module 1','Benchmark module 2','Benchmark module 3','Benchmark module 4'])
    assert.equal(await page.getByRole('progressbar').count(),0)
    await page.screenshot({path:dir+'/outline-en.png',fullPage:true})
    const unknown = await status('/en/learning-paths/missing')
    assert.equal(unknown.status(),404)
    const handoff = await status('/en/learning-paths/bench-2/start')
    assert.equal(handoff.status(),307)
    assert.equal(new URL(handoff.headers().location,app).searchParams.get('redirectTo'),'/en/learning-paths/bench-2/start')
    const resume = await status('/ar/learn')
    assert.equal(resume.status(),307)
    const resumeLogin = new URL(resume.headers().location,app)
    assert.equal(resumeLogin.pathname,'/ar/login')
    assert.equal(resumeLogin.searchParams.get('redirectTo'),'/ar/learn')
    assert.equal(await state(meta.firstStart,3),null)
    await noWrites()
    console.log('PASS: public homepage, interactive example, catalog and ordered outline, direct 404, read-only guest handoff')

    await page.goto(app+'/en/learning-paths/bench-2')
    await page.getByRole('link',{name:'Start Learning',exact:true}).click()
    await page.waitForURL('**/en/login?**')
    assert.equal(new URL(page.url()).searchParams.get('redirectTo'),'/en/learning-paths/bench-2/start')
    assert.match(await page.locator('a[href*="/register"]').last().getAttribute('href'),/redirectTo=/)
    await page.locator('input[name="email"]').fill('fixture3@example.test')
    await page.locator('input[name="password"]').fill('Fixture!1234')
    const [opened] = await Promise.all([
      page.waitForResponse(r=>new URL(r.url()).pathname==='/api/academy/lesson-open'),
      page.waitForURL('**/academy/lessons/'+meta.firstStart,{timeout:20000}),
      page.locator('form button[type="submit"]').click(),
    ])
    assert.equal(opened.status(),204)
    assert.equal((await state(meta.firstStart,3)).status,'in_progress')
    await page.goto(app+details)
    await ready('Benchmark path 1')
    assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0')
    await page.getByRole('button',{name:'Account menu',exact:true}).waitFor()
    console.log('PASS: password sign-in retained the intended path and opened its first accessible lesson')
  } finally { await guest.close() }

  const signed = await browser.newContext({ viewport:{width:1440,height:1000},reducedMotion:'reduce' })
  const session = await json('/__session?user=2')
  await signed.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:app,httpOnly:true,sameSite:'Lax'}])
  try {
    const p = await signed.newPage()
    await json('/__events')
    await p.goto(app+'/en')
    await p.getByRole('button',{name:'Account menu',exact:true}).waitFor()
    assert.equal(await p.getByRole('link',{name:'Log in',exact:true}).count(),0)
    await p.goto(app+details)
    await p.getByRole('progressbar').waitFor()
    assert.equal(await p.getByRole('progressbar').getAttribute('value'),'1')
    await p.getByRole('link',{name:'Continue Learning',exact:true}).waitFor()
    await p.locator('details summary').nth(1).click()
    await p.getByText('Locked',{exact:true}).first().waitFor()
    await p.evaluate(() => window.scrollTo(0, 0))
    await p.screenshot({path:dir+'/progress-en.png',fullPage:true})
    const launch = await signed.request.get(app+details+'/start',{maxRedirects:0,headers:{RSC:'1','Next-Router-Prefetch':'1'}})
    assert.equal(launch.status(),307)
    assert.equal(new URL(launch.headers().location,app).pathname,'/en/academy/lessons/'+meta.lesson)
    const resume = await signed.request.get(app+'/en/learn',{maxRedirects:0})
    assert.equal(resume.status(),307)
    assert.equal(new URL(resume.headers().location,app).pathname,'/en/academy/lessons/'+meta.lesson)
    await noWrites()
    await p.getByRole('link',{name:'Continue Learning',exact:true}).click()
    await p.waitForURL('**/academy/lessons/'+meta.lesson)
    await p.getByRole('heading',{name:'Benchmark lesson 1.2',exact:true}).waitFor()
    await p.goBack()
    await p.getByRole('heading',{name:'Benchmark path 1',exact:true}).waitFor()
    await p.getByRole('link',{name:'العربية',exact:true}).click()
    await p.getByRole('heading',{name:'المسار 1',exact:true}).waitFor()
    assert.equal(await p.locator('html').getAttribute('dir'),'rtl')
    console.log('PASS: signed-in home, private progress, locked lessons, read-only prefetch and real resume, back navigation and locale')
  } finally { await signed.close() }

  const mobile = await browser.newContext({ viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce' })
  try {
    const p = await mobile.newPage()
    for (const width of [390,768,320]) {
      await p.setViewportSize({width,height:844})
      for (const suffix of ['', '/learning-paths', '/learning-paths/bench-1']) {
        await p.goto(app+'/ar'+suffix)
        assert.equal(await p.locator('html').getAttribute('dir'),'rtl')
        const fits = await p.evaluate(viewport => document.documentElement.scrollWidth <= viewport + 1, width)
        assert(fits,'No horizontal overflow at '+width+' on /ar'+suffix)
        if (width===390 && !suffix) await p.screenshot({path:dir+'/home-ar-mobile.png',fullPage:true})
      }
    }
    console.log('PASS: Arabic RTL pages at 320, 390 and 768 pixels')
  } finally { await mobile.close() }
}

async function main() {
  const mode = process.argv[2] || 'after'
  const browser = await chromium.launch({channel:'chrome'})
  try {
    if (mode === 'verify') return await browserChecks(browser)
    const scenarios = mode === 'before' ? suite.slice(0,1) : suite
    const samples = []
    for (const [name,url] of scenarios) {
      const warm = await browser.newContext()
      await (await warm.newPage()).goto(app+url)
      await warm.close()
      for (let n=0;n<7;n++) {
        const context = await browser.newContext({viewport:{width:1280,height:900}})
        await context.addInitScript(()=>{
          window.lcp = 0
          new PerformanceObserver(list=>{
            for (const entry of list.getEntries()) window.lcp = entry.startTime
          }).observe({type:'largest-contentful-paint',buffered:true})
        })
        try {
          const page = await context.newPage()
          await json('/__events')
          const start = performance.now()
          const response = await page.goto(app+url,{waitUntil:'domcontentloaded'})
          assert.equal(response.status(),200)
          await page.locator('h1').waitFor()
          if (mode !== 'before') await page.getByText(name==='detail'?'Benchmark lesson 1.1':'Benchmark path 1',{exact:true}).first().waitFor()
          const ready = performance.now()-start
          await page.waitForTimeout(650)
          const browserMetrics = await page.evaluate(()=>{
            const doc = performance.getEntriesByType('navigation')[0]
            const resources = performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin===location.origin)
            return {ttfb:doc.responseStart,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,lcp:window.lcp,
              totalBytes:doc.transferSize+resources.reduce((n,r)=>n+r.transferSize,0),
              jsBytes:resources.filter(r=>new URL(r.name).pathname.endsWith('.js')).reduce((n,r)=>n+r.encodedBodySize,0)}
          })
          const events = await json('/__events')
          assert(events.every(e=>e.status<400),JSON.stringify(events))
          samples.push({name,ready,...browserMetrics,db:events.filter(e=>e.path.startsWith('/rest/')).length,auth:events.filter(e=>e.path.startsWith('/auth/')).length})
        } finally { await context.close() }
      }
    }
    const metrics = ['ready','ttfb','fcp','lcp','totalBytes','jsBytes','db','auth']
    const summary = Object.fromEntries(scenarios.map(([name])=>[name,Object.fromEntries(metrics.map(m=>[m,round(med(samples.filter(s=>s.name===name).map(s=>s[m])))]))]))
    const output = process.argv[3] || '.test-output/phase2-public-'+mode+'.json'
    fs.writeFileSync(output,JSON.stringify({mode,browser:browser.version(),summary,samples},null,2))
    console.table(summary)
  } finally { await browser.close() }
}
main().catch(error=>{console.error(error);process.exitCode=1})
