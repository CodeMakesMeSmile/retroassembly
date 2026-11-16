import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { DownloadError, downloadWithProgress } from '#@/pages/library/utils/download.ts'
import { getLoadingProgress } from '#@/pages/library/utils/loading-progress.ts'

// A game's Start button shows how far its files have got: the largest still downloading, and all of them together
await describe('loading progress', async () => {
  await it('names the largest download still under way, and fills by all of them together', () => {
    const progress = getLoadingProgress([
      { kind: 'emulator', loaded: 5, total: 5 },
      { kind: 'game', loaded: 300, total: 1000 },
      { kind: 'files', loaded: 0, total: 7 },
    ])
    assert.deepEqual(progress, { fraction: 305 / 1012, loaded: 300, step: 'game', total: 1000 })
  })

  await it('says starting once everything has arrived', () => {
    assert.deepEqual(
      getLoadingProgress([
        { kind: 'emulator', loaded: 5, total: 5 },
        { kind: 'game', loaded: 1000, total: 1000 },
      ]),
      { fraction: 1, step: 'starting' },
    )
    // Nothing to download: everything was already in the browser
    assert.deepEqual(getLoadingProgress([]), { fraction: 1, step: 'starting' })
  })

  await it("can't fill without every size, but still names the step", () => {
    const progress = getLoadingProgress([
      { kind: 'game', loaded: 300 },
      { kind: 'files', loaded: 1, total: 7 },
    ])
    assert.equal(progress.fraction, undefined)
    assert.equal(progress.step, 'game')
    assert.equal(progress.loaded, 300)
  })
})

await describe('downloading with progress', async () => {
  let server: Server
  let base = ''
  const content = new Uint8Array(300_000).map((_, index) => index % 251)
  before(async () => {
    server = createServer((request, response) => {
      if (request.url === '/sized') {
        response.writeHead(200, { 'Content-Length': String(content.length) })
        // In pieces, as a network would
        for (let start = 0; start < content.length; start += 65_536) {
          response.write(content.subarray(start, start + 65_536))
        }
        response.end()
      } else if (request.url === '/unsized') {
        response.writeHead(200)
        response.end(content)
      } else {
        response.writeHead(404)
        response.end()
      }
    })
    await new Promise<void>((resolve) => {
      server.listen(0, resolve)
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  after(() => {
    server.close()
  })

  await it('reports progress as it arrives, and returns every byte', async () => {
    const reports: [number, number | undefined][] = []
    const buffer = await downloadWithProgress(`${base}/sized`, {
      kind: 'game',
      onProgress: (loaded, total) => reports.push([loaded, total]),
    })
    assert.deepEqual(new Uint8Array(buffer), content)
    assert.deepEqual(reports[0], [0, content.length])
    assert.deepEqual(reports.at(-1), [content.length, content.length])
    assert.ok(reports.length > 2)
    assert.ok(reports.every(([, total]) => total === content.length))
  })

  await it('works without a size, growing as it goes', async () => {
    const buffer = await downloadWithProgress(`${base}/unsized`, { kind: 'files' })
    assert.deepEqual(new Uint8Array(buffer), content)
  })

  await it('says what failed to download', async () => {
    await assert.rejects(downloadWithProgress(`${base}/missing`, { kind: 'game' }), (error) => {
      assert.ok(error instanceof DownloadError)
      assert.equal(error.kind, 'game')
      return true
    })
  })
})
