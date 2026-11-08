import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { curriculumImportSchema } from '../../src/lib/curriculum/import-schema'

const server = 'http://127.0.0.1:3008'

test('real Next.js serves legacy public JSON URLs with attachment headers and no locale redirect', async ({ page, request }) => {
  await page.goto(server + '/en/login')
  for (const file of ['schema', 'example']) {
    const url = server + `/curriculum/${file}.json`
    const response = await request.get(url, { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    expect(response.headers()['location']).toBeUndefined()
    expect(response.headers()['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers()['content-disposition']).toBe(`attachment; filename="curriculum-${file}.json"`)
    const event = page.waitForEvent('download')
    await page.evaluate(url => { window.location.assign(url) }, url)
    const download = await event
    expect(download.suggestedFilename()).toBe(`curriculum-${file}.json`)
    expect(await download.failure()).toBeNull()
    const json = JSON.parse(fs.readFileSync((await download.path())!, 'utf8'))
    expect(json).toEqual(await response.json())
    if (file === 'example') curriculumImportSchema.parse(json)
  }
})

test('real Next.js download routes reject anonymous requests with JSON instead of redirecting to login', async ({ request }) => {
  for (const file of ['schema', 'example', 'export', 'backup']) {
    const response = await request.fetch(server + `/api/admin/curriculum/download?file=${file}`, { method: file === 'backup' ? 'POST' : 'GET', maxRedirects: 0 })
    expect(response.status()).toBe(401)
    expect(response.headers()['location']).toBeUndefined()
    expect(response.headers()['content-disposition']).toBeUndefined()
    expect(response.headers()['content-type']).toContain('application/json')
    expect((await response.json()).error).toBe('Authentication required')
  }
})
