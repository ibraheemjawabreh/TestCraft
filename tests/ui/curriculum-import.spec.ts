import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { en } from '../../src/i18n/dictionaries/en'
import { curriculumImportSchema } from '../../src/lib/curriculum/import-schema'

for (const locale of ['en', 'ar'] as const) test(`curriculum JSON downloads and downloaded-example preview work in ${locale}`, async ({ page, request }) => {
  await request.get('/__fixture/reset')
  const payload = JSON.parse(fs.readFileSync('tests/fixtures/curriculum-import.json', 'utf8'))
  const preview = await (await request.post('/api/admin/curriculum/import?role=admin', { data: { action: 'preview', payload } })).json()
  const start = await (await request.post('/api/admin/curriculum/import?role=admin', { data: { action: 'prepare', payload: preview.data.document, revision: preview.data.revision } })).json()
  await request.post('/api/admin/curriculum/import?role=admin', { data: { action: 'batch', source_id: start.data.source_id, offset: 0 } })
  const before = await (await request.get('/__fixture/state')).json()
  const staticRequests: string[] = []
  // Reproduce the unavailable localized HTML response behind the old static links.
  await page.route('**/curriculum/*.json', async route => {
    staticRequests.push(route.request().url())
    await route.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Not found</h1>' })
  })
  await page.goto(`/?view=import&role=admin&locale=${locale}`)
  async function download(label: string, filename: string) {
    const event = page.waitForEvent('download')
    await page.getByRole('button', { name: label, exact: true }).click()
    const file = await event
    expect(file.suggestedFilename()).toBe(filename)
    expect(await file.failure()).toBeNull()
    const path = await file.path()
    const body = fs.readFileSync(path!, 'utf8')
    return { body, json: JSON.parse(body) }
  }
  const sample = await download(locale === 'ar' ? 'تنزيل المثال' : 'Download example', 'curriculum-example.json')
  const parsed = curriculumImportSchema.parse(sample.json)
  expect(parsed.paths).toHaveLength(1)
  expect(parsed.paths[0].modules).toHaveLength(1)
  expect(parsed.paths[0].modules[0].lessons).toHaveLength(1)
  expect(parsed.paths[0].modules[0].lessons[0].content_ar).toMatch(/[\u0600-\u06ff]/)
  await page.locator('input[type=file]').setInputFiles({ name: 'curriculum-example.json', mimeType: 'application/json', buffer: Buffer.from(sample.body, 'utf8') })
  await page.getByRole('button', { name: locale === 'ar' ? 'التحقق ومعاينة التغييرات' : 'Validate and preview', exact: true }).click()
  await expect(page.getByLabel('Import preview')).toContainText(locale === 'ar' ? '1 مسارات · 1 وحدات · 1 دروس' : '1 paths · 1 modules · 1 lessons')
  await expect(page.getByRole('alert')).toHaveCount(0)
  const schema = await download(locale === 'ar' ? 'مخطط JSON' : 'JSON schema', 'curriculum-schema.json')
  expect(schema.json).toEqual(JSON.parse(fs.readFileSync('public/curriculum/schema.json', 'utf8')))
  const exported = await download(locale === 'ar' ? 'تصدير المنهج' : 'Export curriculum', 'testcraft-curriculum.json')
  curriculumImportSchema.parse(exported.json)
  expect(exported.json.paths[0].modules.flatMap((m: any) => m.lessons)).toHaveLength(2)
  const backup = await download(locale === 'ar' ? 'تنزيل نسخة احتياطية' : 'Download backup', 'testcraft-curriculum-backup.json')
  expect(backup.json.format).toBe('testcraft-master-backup-v1')
  expect(backup.json.lessons.map((l: any) => l.id).sort()).toEqual(before.lessons.map((l: any) => l.id).sort())
  expect(await (await request.get('/__fixture/state')).json()).toEqual(before)
  expect(staticRequests).toEqual([])
})

test('the exact downloaded example imports as a draft through the real UI', async ({ page, request }) => {
  await request.get('/__fixture/reset')
  await page.goto('/?view=import&role=admin')
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download example', exact: true }).click()
  const file = await event
  expect(await file.failure()).toBeNull()
  await page.locator('input[type=file]').setInputFiles((await file.path())!)
  await page.getByRole('button', { name: 'Validate and preview', exact: true }).click()
  await expect(page.getByLabel('Import preview')).toContainText('1 paths · 1 modules · 1 lessons')
  await page.getByRole('button', { name: 'Import as drafts', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Import complete: 1/1')
  const state = await (await request.get('/__fixture/state')).json()
  expect(state.lessons).toHaveLength(1)
  expect(state.lessons[0].is_published).toBe(false)
  const exportedEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export curriculum', exact: true }).click()
  const exportedFile = await exportedEvent
  expect(await exportedFile.failure()).toBeNull()
  const exported = JSON.parse(fs.readFileSync((await exportedFile.path())!, 'utf8'))
  expect(exported.paths[0].modules[0].lessons[0].status).toBe('draft')
  curriculumImportSchema.parse(exported)
})

test('HTML, login redirects and expired sessions never become downloaded files', async ({ page }) => {
  await page.goto('/?view=import&role=admin')
  let mode = 'expired', count = 0
  page.on('download', () => count++)
  await page.route('**/api/admin/curriculum/download?file=*', route => {
    if (mode === 'expired') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Authentication required"}' })
    if (mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Sign in</h1>' })
    return route.fulfill({ status: 302, headers: { Location: '/en/login' } })
  })
  for (const scenario of ['expired', 'html', 'redirect']) {
    mode = scenario
    for (const label of ['JSON schema', 'Download example', 'Export curriculum', 'Download backup']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect(page.getByRole('alert')).toContainText(scenario === 'expired' ? 'Authentication required' : scenario === 'html' ? 'instead of JSON' : /fetch|redirect/i)
      await expect(page.getByRole('button', { name: label, exact: true })).toBeEnabled()
    }
  }
  expect(count).toBe(0)
})

test('Import Curriculum uploads, previews, writes, exports and safely re-imports the sample', async ({ page, request }) => {
  await request.get('/__fixture/reset')
  await page.goto('/?view=import&role=admin')
  await expect(page.getByRole('heading', { name: 'Import Curriculum' })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/curriculum-import.json')
  await page.getByRole('button', { name: 'Validate and preview', exact: true }).click()
  await expect(page.getByLabel('Import preview')).toContainText('1 paths · 2 modules · 2 lessons')
  await page.getByRole('button', { name: 'Import as drafts', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Import complete: 2/2')
  let state = await (await request.get('/__fixture/state')).json()
  expect(state.lessons).toHaveLength(2)
  expect(state.lessons.every((l: any) => !l.is_published)).toBe(true)
  await page.getByRole('button', { name: 'Validate and preview', exact: true }).click()
  await expect(page.getByLabel('Import preview')).toContainText('unchanged')
  await page.getByRole('button', { name: 'Import as drafts', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Existing lessons kept: 2')
  state = await (await request.get('/__fixture/state')).json()
  expect(state.lessons).toHaveLength(2)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export curriculum', exact: true }).click()
  const exported = await download
  const file = await exported.path()
  const doc = JSON.parse(fs.readFileSync(file!, 'utf8'))
  expect(doc.paths[0].modules[0].lessons[0].content_ar).toContain('اختبار')
  await page.getByLabel('Curriculum JSON').fill('{"format":"testcraft-curriculum-v1","paths":[]}')
  await page.getByRole('button', { name: 'Validate and preview', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import as drafts', exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?view=import&role=admin&locale=ar')
  await expect(page.getByRole('heading', { name: 'استيراد المنهج' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '.test-output/curriculum-import-ar.png', fullPage: true })
})

test('exercise editor previews both languages and saves a new draft version', async ({ page, request }) => {
  await request.get('/__fixture/reset')
  await page.goto('/?view=import&role=admin')
  const payload = JSON.parse(fs.readFileSync('tests/fixtures/curriculum-import.json', 'utf8'))
  const preview = await (await request.post('/api/admin/curriculum/import?role=admin', { data: { action: 'preview', payload } })).json()
  const start = await (await request.post('/api/admin/curriculum/import?role=admin', { data: { action: 'prepare', payload: preview.data.document, revision: preview.data.revision } })).json()
  await request.post('/api/admin/curriculum/import?role=admin', { data: { action: 'batch', source_id: start.data.source_id, offset: 0 } })
  await page.goto('/?view=practice&role=admin')
  const explanation = page.getByRole('textbox', { name: en.factory.explanation, exact: true }).first()
  await explanation.fill((await explanation.inputValue()) + ' Checked in the editor.')
  await page.getByRole('button', { name: 'العربية', exact: true }).click()
  await expect(explanation).toHaveValue(/[\u0600-\u06ff]/)
  await page.getByRole('button', { name: 'Save exercises', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Exercises saved as drafts.')
  const exported = await (await request.get('/api/admin/curriculum/import?role=admin')).json()
  const all = exported.paths[0].modules.flatMap((m: any) => m.lessons)
  expect(all.some((l: any) => l.practice.some((a: any) => a.explanation.en.includes('Checked in the editor.')))).toBe(true)
})
