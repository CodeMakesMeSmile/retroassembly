import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import { getStoragePath } from '#@/utils/server/storage-path.ts'

const root = path.resolve('/data/storage')

await describe('stored file paths', async () => {
  await it('resolves stored files inside the storage directory', () => {
    assert.equal(getStoragePath(root, 'roms/abc.zip'), path.join(root, 'roms/abc.zip'))
    assert.equal(getStoragePath(root, 'a/./b/../c.bin'), path.join(root, 'a/c.bin'))
  })

  await it('refuses ids that reach outside the storage directory', () => {
    for (const id of ['../retroassembly.sqlite', 'roms/../../retroassembly.sqlite', '..', '/etc/passwd', '', '.']) {
      assert.equal(getStoragePath(root, id), undefined, id)
    }
  })

  await it('treats a sibling directory sharing the name prefix as outside', () => {
    assert.equal(getStoragePath(root, '../storage-other/x'), undefined)
  })
})
