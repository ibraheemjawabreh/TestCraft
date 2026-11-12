// Exercises the production build and its isolated PostgreSQL adapter.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { createHash } = require('node:crypto')
const origin = process.env.TESTCRAFT_UI_URL || 'http://127.0.0.1:3210'
const fixture = 'http://127.0.0.1:3211'
const output = '.test-output/phase35-screenshots'
const id = (key) => createHash('md5').update(key).digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
const data = async (path) => {
  const response = await fetch(fixture + path)
  assert.equal(response.status, 200, path)
  return response.json()
}

async function context(browser, actor, theme, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  if (theme) await ctx.addInitScript((selected) => localStorage.setItem('theme', selected), theme)
  if (actor) {
    const session = await data('/__session?user=' + actor)
    await ctx.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: origin }])
  }
  return ctx
}

async function fillLogin(page, password = 'Fixture!1234', email = 'fixture2@example.test') {
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  await page.locator('main button[type=submit]').click()
}

async function choose(page, control, name) {
  await page.getByRole('combobox', { name: control }).selectOption({label:name})
}

function watchHydration(page, errors) {
  page.on('pageerror', error => errors.push(page.url() + ' ' + error.message))
  page.on('console', entry => {
    if (entry.type() === 'error' && /hydrat|react error #(418|423|425)/i.test(entry.text())) errors.push(page.url() + ' ' + entry.text())
  })
}

async function verify(browser, meta) {
  const guest = await context(browser, 0, null, 320)
  const learner = await context(browser, 0, null, 768)
  const newcomer = await context(browser, 3)
  const recovery = await context(browser)
  const errors = []
  try {
    const g = await guest.newPage()
    const p = await learner.newPage()
    const n = await newcomer.newPage()
    for (const page of [g,p,n]) watchHydration(page,errors)
    await g.goto(origin + '/en')
    await expect(g.locator('#hero-heading')).toBeVisible()
    await expect(g.locator('header nav').getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href','/en')
    await expect(g.locator('footer a[href^="mailto:"]')).toHaveAttribute('href','mailto:ibraheemjawabra@gmail.com')
    await expect(g.locator('footer a[href*="linkedin.com"]')).toHaveCount(1)
    await expect(g.locator('footer a[href*="github.com"]')).toHaveCount(1)
    await expect(g.locator('footer a[href="/en/privacy"]')).toHaveCount(1)
    await expect(g.locator('footer a[href="/en/terms"]')).toHaveCount(1)

    const theme = g.getByRole('combobox',{name:'Toggle theme'})
    await theme.focus()
    await expect(theme).toBeFocused()
    await expect(theme).toHaveValue('dark')
    await theme.press('Home')
    await expect(g.locator('html')).toHaveClass(/light/)
    await g.reload()
    await expect(g.locator('html')).toHaveClass(/light/)
    const language = g.getByRole('combobox',{name:/Switch language/})
    await language.focus()
    await expect(language).toBeFocused()
    await expect(language).toHaveValue('en')
    await language.press('End')
    await g.waitForURL('**/ar')
    await expect(g.locator('html')).toHaveAttribute('dir','rtl')
    await expect(g.locator('html')).toHaveClass(/light/)
    const localeRedirect = await guest.request.get(origin+'/',{maxRedirects:0})
    assert.match(localeRedirect.headers().location,/\/ar$/)

    const protectedPage = '/ar/academy/home'
    await g.goto(origin + protectedPage)
    assert.equal(new URL(g.url()).searchParams.get('redirectTo'),protectedPage)
    await expect(g.locator('main input[type=email]')).toBeVisible()
    const safe = await guest.request.get(origin + '/en/academy?path='+meta.otherPath,{maxRedirects:0})
    assert.equal(new URL(safe.headers().location).searchParams.get('redirectTo'),'/en/academy?path='+meta.otherPath)

    await p.goto(origin+'/en/login')
    await fillLogin(p)
    await p.waitForURL('**/en/academy/home')
    await expect(p.getByRole('heading',{name:'Welcome, Bench Tester'})).toBeVisible()
    await expect(p.locator('#recent-lesson')).toBeVisible()
    await expect(p.getByRole('link',{name:'Open last lesson'})).toHaveAttribute('href',/\/academy\/lessons\//)
    await expect(p.locator('section[aria-labelledby="started-paths"] progress')).toHaveCount(1)
    await expect(p.getByRole('link',{name:'Continue learning',exact:true})).toHaveAttribute('href','/en/learn')
    await expect(p.locator('header nav').getByRole('link',{name:'Home',exact:true})).toHaveAttribute('href','/en/academy/home')
    await expect(p.locator('#hero-heading')).toHaveCount(0)
    await p.getByRole('button',{name:'Account menu'}).click()
    await expect(p.getByRole('menuitem',{name:'Account Settings'})).toBeVisible()
    await p.keyboard.press('Escape')
    await p.goto(origin+'/en')
    await expect(p.locator('#hero-heading')).toBeVisible()
    await expect(p.locator('header nav').getByRole('link',{name:'Home',exact:true})).toHaveAttribute('href','/en')
    await expect(p.locator('header nav').getByRole('link',{name:'Student Home',exact:true})).toHaveAttribute('href','/en/academy/home')
    await expect(p.locator('header nav').getByRole('link',{name:'Progress',exact:true})).toHaveCount(0)

    await p.goto(origin + '/en/academy?path=' + meta.otherPath)
    await choose(p,/Switch language/,'العربية')
    await p.waitForURL(url=>url.pathname==='/ar/academy' && url.searchParams.get('path')===meta.otherPath)
    await expect(p.locator('html')).toHaveAttribute('lang','ar')
    await expect(p.locator('header button[aria-label="قائمة الحساب"]')).toBeVisible()
    await expect(p.locator('header nav a[href="/ar/academy/home"]')).toBeVisible()
    const start = await learner.request.get(origin + '/en/learn',{maxRedirects:0})
    assert.match(start.headers().location,/\/en\/academy\/lessons\//)

    await g.goto(origin+'/en/academy/lessons/'+meta.lesson)
    assert.equal(new URL(g.url()).searchParams.get('redirectTo'),'/en/academy/lessons/'+meta.lesson)
    await choose(g,/Switch language/,'العربية')
    await g.waitForURL(url=>url.pathname==='/ar/login' && url.searchParams.get('redirectTo')==='/ar/academy/lessons/'+meta.lesson)
    await fillLogin(g)
    await g.waitForURL('**/ar/academy/lessons/'+meta.lesson)

    await n.goto(origin+'/en/academy/home')
    await expect(n.getByText('Your paths will appear here as you record progress.')).toBeVisible()
    await expect(n.getByText('Start a published path and your last lesson will appear here.')).toBeVisible()
    await expect(n.getByText('Bench Tester',{exact:false})).toHaveCount(0)

    const r = await recovery.newPage()
    watchHydration(r,errors)
    await r.goto(origin+'/ar/update-password')
    await r.waitForURL('**/ar/forgot-password?error=invalid_link')
    await expect(r.locator('main').getByRole('alert')).toBeVisible()
    await r.locator('main button[type=submit]').click()
    await expect(r.locator('form').getByRole('alert')).toBeVisible()
    await r.locator('input[type=email]').fill('fixture3@example.test')
    await r.locator('main button[type=submit]').click()
    await expect(r.getByRole('status')).toContainText('رابط الاستعادة')
    const mail = await data('/__recovery')
    const callback = new URL(mail.redirectTo)
    assert.equal(callback.pathname,'/auth/callback')
    callback.searchParams.set('code','fixture-recovery-code')
    await r.goto(callback.href)
    await r.waitForURL('**/ar/update-password')
    await expect(r.locator('input[type=password]')).toHaveCount(2)
    for(const field of await r.locator('input[type=password]').all()) await field.fill('NewFixture!4567')
    await r.locator('main button[type=submit]').click()
    await expect(r.getByRole('status')).toBeVisible()
    await r.locator('main a[href^="/auth/post-login"]').click()
    await r.waitForURL('**/ar/academy/home')
    assert.deepEqual(errors,[])
    console.log('PASS: role-aware login, Student Home data and isolation, landing, keyboard controls, language context, theme persistence, deep links and recovery')
  } finally {
    await Promise.all([guest.close(),learner.close(),newcomer.close(),recovery.close()])
  }
}

async function matrix(browser, meta) {
  const routes = [
    ['landing','/',0], ['paths','/learning-paths',0], ['path-detail','/learning-paths/bench-1',0],
    ['login','/login',0], ['register','/register',0], ['forgot-password','/forgot-password',0],
    ['update-password','/update-password',2], ['privacy','/privacy',0], ['terms','/terms',0],
    ['student-home','/academy/home',2], ['academy','/academy',2], ['lesson','/academy/lessons/'+meta.lesson,2],
    ['progress','/academy/progress',2], ['profile','/profile',2], ['settings','/settings',2],
    ['activity','/academy/activity',2], ['badges','/academy/badges',2], ['challenges','/academy/challenges',2],
    ['challenge-detail','/academy/challenges/'+id('challenge1-1'),2], ['reports','/academy/reports',2],
    ['path-not-found','/learning-paths/missing-fixture-path',0,404], ['not-found','/missing-fixture-page',0,404],
  ]
  const full = ['landing','student-home','path-detail','login','lesson','challenge-detail','profile','settings']
  const results = [], errors = [], failures = []
  const widths = [320,1280]
  fs.mkdirSync(output,{recursive:true})
  for (const locale of ['en','ar']) for (const theme of ['light','dark']) {
    await Promise.all(widths.map(async width => {
      const contexts = await Promise.all([context(browser,0,theme,width),context(browser,2,theme,width)])
      try {
        const pages = await Promise.all(contexts.map(ctx=>ctx.newPage()))
        for (const page of pages) watchHydration(page, errors)
        for (const [name,path,actor,status=200] of routes) {
          const page = pages[actor ? 1 : 0]
          const tag = [name,locale,theme,width].join('-')
          try {
            const response = await page.goto(origin+'/'+locale+(path==='/'?'':path),{waitUntil:'load'})
            assert.equal(response.status(),status,tag)
            await expect(page.locator('html')).toHaveAttribute('lang',locale)
            await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr')
            await expect(page.locator('html')).toHaveClass(new RegExp(theme))
            await expect(page.locator('h1').first()).toBeVisible()
            const header = page.locator('body > div > header')
            if (status!==404) {
              await expect(header).toHaveCount(1)
              const controls = header.locator('.site-control')
              await expect(controls).toHaveCount(2)
              const [a,b] = await Promise.all([controls.first().boundingBox(),controls.last().boundingBox()])
              for (const box of [a,b]) assert(box && box.width>=43 && box.height>=43 && box.x>=0 && box.x+box.width<=width+1,tag+' clipped header control')
              const contrast = await controls.evaluateAll(items => {
                function luminance(color) {
                  const rgb = color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number).map(n=>n/255)
                    .map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4)
                  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
                }
                return items.map(item=>{
                  const style=getComputedStyle(item)
                  const values=[luminance(style.color),luminance(style.backgroundColor)].sort((a,b)=>b-a)
                  return (values[0]+.05)/(values[1]+.05)
                })
              })
              assert(contrast.every(ratio=>ratio>=4.5),tag+' weak header control contrast')
              const logo = header.locator('img[src*="TestCraft_logo"]')
              await expect(logo).toBeVisible()
              await expect.poll(()=>logo.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true)
            }
            const screen = await page.evaluate(()=>({ width: document.documentElement.scrollWidth, headers: document.querySelectorAll('body > div > header').length,
              footers: document.querySelectorAll('footer').length, title: document.querySelector('h1')?.textContent }))
            assert(screen.width<=width+1,tag+' overflow '+screen.width)
            assert(screen.footers<=1,tag+' duplicate footer')
            if (full.includes(name)) await page.screenshot({path:output+'/'+tag+'.png',fullPage:width===1280 && ['landing','student-home'].includes(name)})
            results.push({name,locale,theme,width,status,...screen,viewport:width})
          } catch(error) { failures.push({tag,error:error.message}); console.error(tag,error.message.split('\n')[0]) }
        }
      } finally {
        await Promise.all(contexts.map(ctx=>ctx.close()))
      }
    }))
    console.log('PASS matrix:',locale,theme,'mobile and desktop')
  }
  for (const locale of ['en','ar']) {
    const ctx = await context(browser,2,'dark',768)
    try {
      const page = await ctx.newPage()
      await page.goto(origin+'/'+locale+'/academy/home')
      const control = page.locator('header select').first()
      await control.focus()
      await expect(control).toBeFocused()
      await expect(control).toHaveValue(locale)
      assert.equal(await control.locator('option').count(),2)
      const box = await control.boundingBox()
      assert(box && box.x>=0 && box.x+box.width<=768)
      assert.equal(await control.evaluate(el=>getComputedStyle(el.parentElement).outlineWidth),'2px')
    } finally { await ctx.close() }
  }
  fs.writeFileSync('.test-output/phase35-matrix.json',JSON.stringify({results,failures,errors},null,2))
  assert.deepEqual(failures,[])
  assert.deepEqual(errors,[])
  console.log('PASS:',results.length,'route/theme/direction/viewport checks plus tablet menus')
}

async function benchmarkHome(browser) {
  const samples = []
  for (let i=0;i<7;i++) {
    const ctx = await context(browser,2,'dark')
    try {
      const page = await ctx.newPage()
      await page.addInitScript(()=>{
        window.lcp=0
        new PerformanceObserver(list=>{ for(const entry of list.getEntries()) window.lcp=entry.startTime })
          .observe({type:'largest-contentful-paint',buffered:true})
      })
      await data('/__events')
      const started = performance.now()
      await page.goto(origin+'/en/academy/home',{waitUntil:'domcontentloaded'})
      await page.getByRole('heading',{name:'Welcome, Bench Tester'}).waitFor()
      const ready = performance.now()-started
      await page.waitForTimeout(350)
      const timings = await page.evaluate(()=>{
        const doc=performance.getEntriesByType('navigation')[0]
        const js=performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('.js'))
        return { ttfb:doc.responseStart,lcp:window.lcp,js:js.reduce((sum,r)=>sum+r.encodedBodySize,0) }
      })
      const events = await data('/__events')
      const db = events.filter(e=>e.path.startsWith('/rest/v1/'))
      assert(db.every(e=>['GET','HEAD'].includes(e.method)))
      samples.push({ready,...timings,db:db.length,auth:events.filter(e=>e.path.startsWith('/auth/')).length})
    } finally { await ctx.close() }
  }
  const summary=Object.fromEntries(Object.keys(samples[0]).map(k=>[k,Math.round(samples.map(s=>s[k]).sort((a,b)=>a-b)[3]*10)/10]))
  fs.writeFileSync('.test-output/phase35-home.json',JSON.stringify({summary,samples},null,2))
  console.table(summary)
}

;(async()=>{
  const meta = await data('/__meta')
  const browser = await chromium.launch({channel:'chrome'})
  try {
    const mode=process.argv[2]
    if (mode==='matrix') await matrix(browser,meta)
    else if (mode==='measure') await benchmarkHome(browser)
    else await verify(browser,meta)
  } finally { await browser.close() }
})().catch(error=>{console.error(error);process.exitCode=1})
