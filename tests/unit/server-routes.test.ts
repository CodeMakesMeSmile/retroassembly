import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

// The server's answer to each kind of request, signed in or not, so changes to the request pipeline can't quietly
// change who may see what
const directory = await mkdtemp(path.join(os.tmpdir(), 'retroassembly-routes-'))
process.env.RETROASSEMBLY_RUN_TIME_DATA_DIRECTORY = path.join(directory, 'data')
process.env.RETROASSEMBLY_RUN_TIME_STORAGE_DIRECTORY = path.join(directory, 'data', 'storage')
const clientRoot = path.join(directory, 'client')

const { initializeDatabase } = await import('#@/utils/server/migration/initalization.ts')
const { createServer } = await import('#@/server/create-server.ts')

let app: ReturnType<typeof createServer>
let cookie = ''

function request(url: string, init: RequestInit & { signedIn?: boolean } = {}) {
  const headers = new Headers(init.headers)
  if (init.signedIn) {
    headers.set('Cookie', cookie)
  }
  return app.request(url, { ...init, headers })
}

await describe('server routes', async () => {
  before(async () => {
    await mkdir(path.join(directory, 'data', 'storage'), { recursive: true })
    await mkdir(path.join(clientRoot, 'assets'), { recursive: true })
    await writeFile(path.join(clientRoot, 'assets', 'entry-AbCd1234.js'), 'export {}')
    await writeFile(path.join(clientRoot, 'favicon.png'), 'png')
    await initializeDatabase()
    app = createServer({ client: { root: clientRoot, version: 'test-build' }, pages: (c) => c.text('page') })

    const form = new FormData()
    form.append('username', 'alice')
    form.append('password', 'route-test-password')
    const response = await request('/api/v1/auth/register', { body: form, method: 'POST' })
    assert.equal(response.status, 200)
    cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ')
  })

  after(async () => {
    await rm(directory, { force: true, recursive: true })
  })

  const cases: { path: string; signedIn?: boolean; status: number; location?: string }[] = [
    { path: '/robots.txt', status: 200 },
    { path: '/build-version', status: 200 },
    { path: '/assets/entry-AbCd1234.js', status: 200 },
    { path: '/favicon.png', status: 200 },
    { path: '/login', status: 200 },
    { location: '/login', path: '/library', status: 302 },
    { location: '/login?redirect_to=%2Flibrary%2Froms', path: '/library/roms', status: 302 },
    { path: '/api/v1/roms', status: 400 },
    { path: '/api/v1/files/roms%2Fnes%2Fgame.nes', status: 400 },
    { path: '/library', signedIn: true, status: 200 },
    { path: '/api/v1/roms', signedIn: true, status: 200 },
    { path: '/api/v1/files/roms%2Fnes%2Fgame.nes', signedIn: true, status: 404 },
  ]

  for (const { location, path: url, signedIn, status } of cases) {
    await it(`${signedIn ? 'signed in' : 'signed out'}: ${url} is ${status}`, async () => {
      const response = await request(url, { signedIn })
      assert.equal(response.status, status)
      if (location) {
        assert.equal(response.headers.get('Location'), location)
      }
    })
  }

  await it('keeps fingerprinted files for good and checks fixed-address files each time', async () => {
    const fingerprinted = await request('/assets/entry-AbCd1234.js')
    assert.equal(await fingerprinted.text(), 'export {}')
    assert.equal(fingerprinted.headers.get('Cache-Control'), 'public, immutable, max-age=31536000')
    const fixed = await request('/favicon.png')
    assert.equal(fixed.headers.get('Cache-Control'), 'no-cache')
    const version = await request('/build-version')
    assert.equal(version.headers.get('Cache-Control'), 'no-store')
    assert.equal(await version.text(), 'test-build')
    const page = await request('/login')
    assert.equal(page.headers.get('Cache-Control'), null)
  })

  await it('answers 304 for a fixed-address file that has not changed', async () => {
    const since = new Date(Date.now() + 60_000).toUTCString()
    const response = await request('/favicon.png', { headers: { 'If-Modified-Since': since } })
    assert.equal(response.status, 304)
  })

  await it('answers in the requested language per request', async () => {
    const [english, german] = await Promise.all([
      request('/api/v1/roms', { headers: { 'Accept-Language': 'en' } }),
      request('/api/v1/roms', { headers: { 'Accept-Language': 'de' } }),
    ])
    assert.equal(english.status, 400)
    assert.equal(german.status, 400)
  })
})
