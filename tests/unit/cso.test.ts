import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { inflateRawSync } from 'node:zlib'
import { getCsoFileId, isCompressible } from '#@/utils/server/compress-psp-games.ts'
import { checkCso, compressIsoToCso } from '#@/utils/server/cso.ts'

// Reads a CSO the way an emulator does: each block found through the index, and unpacked on its own
function readCso(cso: Buffer) {
  assert.equal(cso.toString('latin1', 0, 4), 'CISO')
  const total = Number(cso.readBigUInt64LE(8))
  const blockSize = cso.readUInt32LE(16)
  const align = cso.readUInt8(21)
  const blocks = Math.ceil(total / blockSize)
  const parts: Buffer[] = []
  for (let number = 0; number < blocks; number++) {
    const entry = cso.readUInt32LE(24 + number * 4)
    const next = cso.readUInt32LE(24 + (number + 1) * 4)
    const content = cso.subarray((entry & 0x7f_ff_ff_ff) * 2 ** align, (next & 0x7f_ff_ff_ff) * 2 ** align)
    parts.push(entry & 0x80_00_00_00 ? content : inflateRawSync(content))
  }
  return Buffer.concat(parts).subarray(0, total)
}

await describe('PSP games compressed to CSO', async () => {
  let directory = ''
  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'cso-'))
  })
  after(async () => {
    await rm(directory, { force: true, recursive: true })
  })

  // A disc's mix: empty space, repetitive data, and data that doesn't compress (video), ending part way into a block
  const disc = Buffer.concat([
    Buffer.alloc(300_000),
    Buffer.from('PSP GAME DATA '.repeat(40_000)),
    randomBytes(250_000),
    Buffer.alloc(1234, 7),
  ])

  await it('holds the same disc, smaller, readable block by block', async () => {
    const iso = path.join(directory, 'game.iso')
    const cso = path.join(directory, 'game.cso')
    await writeFile(iso, disc)
    const size = await compressIsoToCso(iso, cso)
    assert.equal((await stat(cso)).size, size)
    assert.ok(size < disc.length * 0.5)
    assert.deepEqual(readCso(await readFile(cso)), disc)
    await checkCso(cso, iso)
  })

  await it("isn't accepted if it differs from the ISO", async () => {
    const iso = path.join(directory, 'other.iso')
    const cso = path.join(directory, 'other.cso')
    await writeFile(iso, disc)
    await compressIsoToCso(iso, cso)
    const changed = Buffer.from(disc)
    changed[400_000] ^= 1
    await writeFile(iso, changed)
    await assert.rejects(checkCso(cso, iso), /differs/u)
  })

  await it('leaves nothing behind when it fails', async () => {
    await assert.rejects(compressIsoToCso(path.join(directory, 'missing.iso'), path.join(directory, 'missing.cso')))
    await assert.rejects(stat(path.join(directory, 'missing.cso.partial')))
  })

  await it('applies to PSP ISOs only', () => {
    assert.equal(isCompressible('psp', 'roms/psp/abc.iso'), true)
    assert.equal(isCompressible('psp', 'roms/psp/abc.cso'), false)
    assert.equal(isCompressible('psx', 'roms/psx/abc.iso'), false)
    assert.equal(getCsoFileId('roms/psp/abc.ISO'), 'roms/psp/abc.cso')
  })
})
