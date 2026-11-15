import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getFileKind } from '#@/utils/server/file-kind.ts'

await describe('stored file kinds', async () => {
  await it('reads what each stored file is and whose it is', () => {
    assert.deepEqual(getFileKind('roms/nes/0123abcd.zip'), { kind: 'rom' })
    assert.deepEqual(getFileKind('bioses/psx/0123abcd.bin'), { kind: 'bios' })
    assert.deepEqual(getFileKind('attachments/user1/nes/rom1/a.png'), { kind: 'attachment', userId: 'user1' })
    assert.deepEqual(getFileKind('states/user1/nes/rom1/s.state'), { kind: 'state', userId: 'user1' })
  })

  await it('refuses ids that could name another file once resolved', () => {
    for (const id of [
      'roms/nes/../../states/user2/nes/rom1/s.state',
      'attachments/user1/../user2/a.png',
      'states/./user2/s.state',
      'roms//nes/a.zip',
      String.raw`roms\nes\a.zip`,
      '/roms/nes/a.zip',
    ]) {
      assert.equal(getFileKind(id), undefined, id)
    }
  })

  await it('refuses anything outside the stored folders', () => {
    for (const id of ['retroassembly.sqlite', 'tmp/uploads/x', 'cache/x/y', 'roms/a.zip', 'states/user1']) {
      assert.equal(getFileKind(id), undefined, id)
    }
  })
})
