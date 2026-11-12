// Run only with the loopback Supabase fixture. Use a production build for timing.
const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const app = 'http://127.0.0.1:3210'
const backend = 'http://127.0.0.1:3211'
const key = 'testcraft-perf-fixture'
const json = async path => {
  const response = await fetch(backend + path)
  assert.equal(response.status,200,path)
  return response.json()
}
const open = p => p.getByRole('button',{name:'Account menu',exact:true})
const menu = p => p.getByRole('menu')
const title = (p,name) => p.getByRole('heading',{name,level:1,exact:true})
const median = xs => [...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)]

async function context(browser, user, options = {}) {
  const ctx = await browser.newContext({ viewport:{width:1280,height:900},reducedMotion:'reduce', ...options })
  ctx.setDefaultTimeout(12000)
  if (user) {
    const session = await json('/__session?user='+user)
    await ctx.addCookies([{ name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:app,httpOnly:true,sameSite:'Lax' }])
  }
  return ctx
}

async function verifyMenuHydration(browser) {
  for (const [locale, label] of [['en', 'Account menu'], ['ar', 'قائمة الحساب']]) {
    const student = await context(browser, 2)
    try {
      const page = await student.newPage()
      const mismatches = []
      const capture = message => {
        if (/hydrat|did not match|Minified React error #(?:418|423|425)\b/i.test(message)) mismatches.push(message)
      }
      page.on('console', message => {
        if (['error', 'warning'].includes(message.type())) capture(message.text())
      })
      page.on('pageerror', error => capture(error.message))

      const response = await page.goto(app + '/' + locale, {timeout:60000})
      assert.equal(response.status(), 200)
      const trigger = page.getByRole('button', {name:label, exact:true})
      const dropdown = menu(page)
      try {
        await expect(async () => {
          if (!await dropdown.isVisible()) await trigger.click()
          await expect(dropdown).toBeVisible({timeout:750})
        }).toPass({timeout:12000})
      } catch (error) {
        assert.deepEqual(mismatches, [], locale + ' account menu hydration')
        throw error
      }
      assert.deepEqual(mismatches, [], locale + ' account menu hydration')
      assert.equal(await dropdown.getAttribute('aria-labelledby'), await trigger.getAttribute('id'))
      assert.equal(await trigger.getAttribute('aria-controls'), await dropdown.getAttribute('id'))
      await page.keyboard.press('Escape')
      await dropdown.waitFor({state:'hidden'})
      assert(await trigger.evaluate(node => node === document.activeElement))
      console.log('PASS: signed-in homepage account menu hydration, ARIA and keyboard focus in ' + locale)
    } finally { await student.close() }
  }
}

async function verify(browser) {
  const directory = '.test-output/phase3-screenshots'
  fs.mkdirSync(directory,{recursive:true})
  const guest = await context(browser,0)
  const student = await context(browser,2,{viewport:{width:1440,height:1000}})
  const other = await context(browser,3,{viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  try {
    const g = await guest.newPage()
    assert.equal((await g.goto(app+'/en')).status(),200)
    const publicNav = g.getByRole('navigation',{name:'Main navigation',exact:true})
    assert.deepEqual(await publicNav.getByRole('link').allTextContents(),['Home','Learning Paths'])
    await g.getByRole('link',{name:'Log in',exact:true}).waitFor()
    await g.getByRole('link',{name:'Sign up',exact:true}).waitFor()
    assert.equal(await open(g).count(),0)
    for (const route of ['/en/profile','/ar/profile','/en/settings']) {
      const response = await guest.request.get(app+route,{maxRedirects:0})
      assert.equal(response.status(),307)
      const location = new URL(response.headers().location,app)
      assert.equal(location.pathname,route.slice(0,3)+'/login')
      assert.equal(location.searchParams.get('redirectTo'),route)
    }
    console.log('PASS: bilingual protected routes and anonymous navigation')

    const p = await student.newPage()
    await p.goto(app+'/en')
    const primary = p.getByRole('navigation',{name:'Main navigation',exact:true})
    assert.deepEqual(await primary.getByRole('link').allTextContents(),['Home','Learning Paths','Student Home'])
    assert.equal(await p.getByRole('link',{name:'Log in',exact:true}).count(),0)
    assert.equal(await open(p).locator('img').getAttribute('src'),'/favicon.svg')
    await open(p).click()
    await menu(p).getByText('fixture2@example.test',{exact:true}).waitFor()
    await p.screenshot({path:directory+'/account-en.png',fullPage:false})
    await p.mouse.click(40,350)
    await menu(p).waitFor({state:'hidden'})
    await open(p).focus()
    await p.keyboard.press('Enter')
    await menu(p).waitFor()
    await p.keyboard.press('ArrowDown')
    assert(await p.evaluate(()=>document.activeElement?.getAttribute('role')==='menuitem'))
    await p.keyboard.press('Escape')
    await menu(p).waitFor({state:'hidden'})
    assert(await open(p).evaluate(node=>node===document.activeElement))
    await json('/__events')
    await open(p).click()
    await menu(p).getByRole('menuitem',{name:'My Profile'}).click()
    await title(p,'Bench Tester').waitFor()
    await p.getByText('First lesson completed',{exact:true}).waitFor()
    await p.getByText('Awarded for finishing your first lesson.',{exact:true}).waitFor()
    assert(await p.locator('time[datetime]').count()>=1)
    assert.equal(await p.getByText('Completed lessons',{exact:true}).locator('..').locator('dd').innerText(),'145')
    const profileEvents = await json('/__events')
    assert(profileEvents.every(event=>!event.path.startsWith('/rest/') || ['GET','HEAD'].includes(event.method)),
      'Profile must display persisted rewards without writing any rows')
    await p.screenshot({path:directory+'/profile-en.png',fullPage:true})

    await p.getByRole('link',{name:'My reports and review feedback',exact:true}).click()
    await title(p,'Your Reports').waitFor()
    await p.getByText('Benchmark report',{exact:true}).first().waitFor()
    await primary.getByRole('link',{name:'Progress',exact:true}).click()
    await p.getByText('Completed Lessons',{exact:true}).waitFor()
    await open(p).click()
    await menu(p).getByRole('menuitem',{name:'My Profile'}).click()
    await p.getByRole('link',{name:'Open the Academy workspace',exact:true}).click()
    await p.getByText('Benchmark module 1',{exact:true}).first().waitFor()
    console.log('PASS: real avatar, mouse and keyboard menu, persisted badges, reports, Progress and Academy')

    const m = await other.newPage()
    await m.goto(app+'/ar/profile')
    await title(m,'متعلّم TestCraft').waitFor()
    assert.equal(await m.locator('html').getAttribute('dir'),'rtl')
    assert.equal(await m.getByText('إكمال أول درس',{exact:true}).count(),0)
    await m.getByText('تظهر شاراتك هنا بعد أن تحقّق شروطها أثناء التعلّم.',{exact:true}).waitFor()
    const arMenu = m.getByRole('button',{name:'قائمة الحساب',exact:true})
    for (const width of [320,390,768]) {
      await m.setViewportSize({width,height:844})
      assert(await m.evaluate(w=>document.documentElement.scrollWidth<=w+1,width))
      await arMenu.tap()
      await menu(m).getByText('fixture3@example.test',{exact:true}).waitFor()
      assert.equal(await menu(m).getByText('fixture2@example.test',{exact:true}).count(),0)
      const rect = await menu(m).boundingBox()
      assert(rect.x>=0 && rect.x+rect.width<=width+1, 'Account menu must fit viewport '+width)
      if (width===390) await m.screenshot({path:directory+'/account-ar-mobile.png'})
      await m.touchscreen.tap(width-16,420)
      await menu(m).waitFor({state:'hidden'})
    }
    await m.setViewportSize({width:390,height:844})
    await m.screenshot({path:directory+'/profile-ar-mobile.png',fullPage:true})

    const before = await json('/__account?user=3')
    const actor = await json('/__session?user=2')
    const rest = (id,body) => fetch(backend+'/rest/v1/profiles?id=eq.'+id, {
      method:'PATCH', headers:{apikey:key,authorization:'Bearer '+actor.access_token,'content-type':'application/json',prefer:'return=representation'}, body:JSON.stringify(body),
    })
    const foreign = await rest('00000000-0000-4000-8000-000000000003',{username:'cross-account'})
    assert.equal(foreign.status,200)
    assert.deepEqual(await foreign.json(),[])
    const roleDenied = await rest(actor.user.id,{role:'admin'})
    const xpDenied = await rest(actor.user.id,{total_xp:9999})
    assert.equal(roleDenied.ok,false)
    assert.equal(xpDenied.ok,false)
    assert.match((await roleDenied.json()).message,/Protected profile fields/)
    assert.match((await xpDenied.json()).message,/Reward totals are server-managed/)
    assert.deepEqual(await json('/__account?user=3'),before)
    console.log('PASS: narrow RTL screens, legacy fallback, badge isolation and denied role/XP/cross-account writes')

    await open(p).click()
    await menu(p).getByRole('menuitem',{name:'Account Settings'}).click()
    const name = p.getByRole('textbox',{name:'Display name',exact:true})
    await name.fill('!')
    await p.getByRole('button',{name:'Save display name'}).click()
    await p.getByText('Enter 2 to 80 characters, including at least one letter or number.',{exact:true}).waitFor()
    await name.fill('  نور أحمد  ')
    await p.getByRole('button',{name:'Save display name'}).click()
    await p.getByText('Profile updated successfully.',{exact:true}).waitFor()
    assert.equal((await json('/__account')).metadata.display_name,'نور أحمد')
    await open(p).click()
    await menu(p).getByText('نور أحمد',{exact:true}).waitFor()
    await p.keyboard.press('Escape')
    const username = p.getByRole('textbox',{name:'Username',exact:true})
    await username.fill('fixture3_000000')
    await p.getByRole('button',{name:'Save username'}).click()
    await p.getByText('This username is already taken.',{exact:true}).waitFor()
    await username.fill('exact-qa-handle')
    await p.getByRole('button',{name:'Save username'}).click()
    await p.getByRole('form',{name:'Username'}).getByText('Profile updated successfully.',{exact:true}).waitFor()
    assert.equal((await json('/__account')).username,'exact-qa-handle')
    await p.goto(app+'/en/profile')
    await title(p,'نور أحمد').waitFor()
    await p.getByText('@exact-qa-handle',{exact:true}).waitFor()
    assert.deepEqual(await json('/__account?user=3'),before)
    console.log('PASS: localized validation, saved display name, exact unique handle, immediate header and profile refresh')

    const forged = await student.request.post(app+'/auth/signout',{form:{locale:'en'},headers:{origin:'https://foreign.example'},maxRedirects:0})
    assert.equal(forged.status(),403)
    await m.setViewportSize({width:390,height:844})
    await arMenu.tap()
    const [logout] = await Promise.all([
      m.waitForResponse(r=>new URL(r.url()).pathname==='/auth/signout'),
      menu(m).getByRole('menuitem',{name:'تسجيل الخروج'}).tap(),
    ])
    assert.equal(logout.status(),303)
    await m.waitForURL('**/ar/login')
    await m.goto(app+'/ar/profile')
    await m.waitForURL('**/ar/login?**')
    await p.reload()
    await title(p,'نور أحمد').waitFor()
    console.log('PASS: same-origin sign-out, localized redirect, protected profile and independent second session')

    await g.goto(app+'/en/register')
    await g.getByLabel('Display name',{exact:true}).fill('  ليان QA  ')
    await g.locator('input[name="email"]').fill('new-student@example.test')
    await g.locator('input[name="password"]').fill('Fixture!1234')
    await g.locator('input[name="confirmPassword"]').fill('Fixture!1234')
    await g.getByRole('checkbox').click()
    await g.locator('form button[type="submit"]').click()
    await g.waitForURL('**/en/academy/home',{timeout:20000})
    await g.getByRole('heading',{name:'Welcome, ليان QA',exact:true}).waitFor()
    const registered = await json('/__account?user=4')
    assert.equal(registered.metadata.display_name,'ليان QA')
    assert.match(registered.username,/^learner_[a-f0-9]{24}_[a-f0-9]{6}$/)
    assert.equal(registered.role,'tester')
    await g.goto(app+'/en/profile')
    await title(g,'ليان QA').waitFor()
    assert.equal((await json('/__account?user=4')).username,registered.username)
    console.log('PASS: registration writes chosen name and separate stable handle through the database trigger')
  } finally {
    await Promise.all([guest.close(),student.close(),other.close()])
  }
}

async function measure(browser) {
  const samples = []
  const warm = await context(browser,2)
  await (await warm.newPage()).goto(app+'/en/profile')
  await warm.close()
  for (let i=0;i<7;i++) {
    const ctx = await context(browser,2)
    try {
      const page = await ctx.newPage()
      await ctx.addInitScript(()=>{
        window.profileLcp = 0
        new PerformanceObserver(list=>{
          for (const entry of list.getEntries()) window.profileLcp = entry.startTime
        }).observe({type:'largest-contentful-paint',buffered:true})
      })
      await json('/__events')
      const begin = performance.now()
      const response = await page.goto(app+'/en/profile',{waitUntil:'domcontentloaded'})
      assert.equal(response.status(),200)
      await page.getByText('First lesson completed',{exact:true}).waitFor()
      const readyMs = performance.now()-begin
      await page.waitForTimeout(400)
      const vitals = await page.evaluate(()=>{
        const doc = performance.getEntriesByType('navigation')[0]
        const js = performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin===location.origin && new URL(r.name).pathname.endsWith('.js'))
        return {ttfb:doc.responseStart,lcp:window.profileLcp,jsBytes:js.reduce((total,r)=>total+r.encodedBodySize,0)}
      })
      const profileEvents = await json('/__events')
      assert(profileEvents.every(event=>event.status<400))

      await open(page).evaluate(button=>{
        button.addEventListener('pointerdown',()=>{
          const start = performance.now()
          const observer = new MutationObserver(()=>{
            if (!document.querySelector('[role="menu"]')) return
            observer.disconnect()
            requestAnimationFrame(()=>{window.accountOpenMs=performance.now()-start})
          })
          observer.observe(document.body,{childList:true,subtree:true})
        },{once:true})
      })
      await open(page).click()
      await menu(page).waitFor()
      await page.waitForFunction(()=>typeof window.accountOpenMs==='number')
      const menuOpenMs = await page.evaluate(()=>window.accountOpenMs)
      const menuRequests = (await json('/__events')).length
      assert.equal(menuRequests,0)
      const navBegin = performance.now()
      await menu(page).getByRole('menuitem',{name:'Account Settings'}).click()
      await page.getByRole('textbox',{name:'Display name',exact:true}).waitFor()
      const settingsMs = performance.now()-navBegin
      samples.push({readyMs,...vitals,db:profileEvents.filter(e=>e.path.startsWith('/rest/')).length,
        auth:profileEvents.filter(e=>e.path.startsWith('/auth/')).length,menuOpenMs,menuRequests,settingsMs})
    } finally { await ctx.close() }
  }
  const summary = Object.fromEntries(Object.keys(samples[0]).map(k=>[k,Math.round(median(samples.map(s=>s[k]))*10)/10]))
  fs.writeFileSync('.test-output/phase3-account-perf.json',JSON.stringify({browser:browser.version(),summary,samples},null,2))
  console.table(summary)
}

;(async()=>{
  const browser = await chromium.launch({channel:'chrome'})
  try {
    if (process.argv.includes('--verify-hydration')) await verifyMenuHydration(browser)
    else if (process.argv.includes('--verify')) await verify(browser)
    else await measure(browser)
  }
  finally { await browser.close() }
})().catch(error=>{console.error(error);process.exitCode=1})
