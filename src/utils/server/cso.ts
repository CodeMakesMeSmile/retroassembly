import { open, rename, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import { deflateRaw, inflateRaw } from 'node:zlib'
import { noop } from 'es-toolkit'

// CSO (compressed ISO, version 1): a 24-byte header, an index of where each block starts, then the blocks, each
// compressed on its own with raw deflate so an emulator can unpack just the part of the disc it's reading

const deflate = promisify(deflateRaw)
const inflate = promisify(inflateRaw)

const headerSize = 24
const blockSize = 2048
// Index entries with this bit set are blocks stored as they are, because compressing them made them no smaller
const plainFlag = 0x80_00_00_00
// Blocks read and written together (2 MB)
const batchSize = 1024
// Blocks compressed or unpacked at the same time: enough to keep zlib's threads busy. Each holds its own working memory
const parallel = 16

/** `work` for each item, `parallel` at a time, results in order */
async function mapInGroups<T, R>(items: T[], work: (item: T, index: number) => Promise<R>) {
  const results: R[] = []
  for (let start = 0; start < items.length; start += parallel) {
    const group = items.slice(start, start + parallel)
    results.push(...(await Promise.all(group.map((item, offset) => work(item, start + offset)))))
  }
  return results
}

function makeHeader(totalBytes: number, align: number) {
  const header = Buffer.alloc(headerSize)
  header.write('CISO', 0, 'latin1')
  header.writeUInt32LE(headerSize, 4)
  header.writeBigUInt64LE(BigInt(totalBytes), 8)
  header.writeUInt32LE(blockSize, 16)
  header.writeUInt8(1, 20)
  header.writeUInt8(align, 21)
  return header
}

/** The smallest alignment that lets every block's position fit the index's 31 bits, even if nothing compresses */
function getAlign(totalBytes: number, blockCount: number) {
  const largest = headerSize + (blockCount + 1) * 4 + totalBytes + blockCount * blockSize
  let align = 0
  while (largest / 2 ** align > 0x7f_ff_ff_ff) {
    align += 1
  }
  return align
}

/**
 * Compresses the ISO at `isoPath` into a CSO at `csoPath`. Written under a temporary name first, so an interrupted
 * compression never leaves a partial file behind. Returns the CSO's size
 */
export async function compressIsoToCso(isoPath: string, csoPath: string) {
  const partialPath = `${csoPath}.partial`
  const input = await open(isoPath, 'r')
  const output = await open(partialPath, 'w')
  try {
    const { size: totalBytes } = await input.stat()
    const blockCount = Math.ceil(totalBytes / blockSize)
    const align = getAlign(totalBytes, blockCount)
    const index = new Uint32Array(blockCount + 1)
    let position = headerSize + index.byteLength
    const padding = Buffer.alloc(2 ** align)

    const batch = Buffer.alloc(batchSize * blockSize)
    for (let first = 0; first < blockCount; first += batchSize) {
      const { bytesRead } = await input.read(batch, 0, batch.length, first * blockSize)
      const batchStart = position
      const blocks: Buffer[] = []
      for (let offset = 0; offset < bytesRead; offset += blockSize) {
        blocks.push(batch.subarray(offset, Math.min(offset + blockSize, bytesRead)))
      }
      const compressed = await mapInGroups(blocks, (block) => deflate(block, { level: 9 }))
      const written: Buffer[] = []
      for (const [number, block] of blocks.entries()) {
        // Each block starts at a multiple of 2^align
        const gap = (2 ** align - (position % 2 ** align)) % 2 ** align
        if (gap) {
          written.push(padding.subarray(0, gap))
          position += gap
        }
        const plain = compressed[number].length >= block.length
        const content = plain ? block : compressed[number]
        index[first + number] = (position / 2 ** align) | (plain ? plainFlag : 0)
        written.push(content)
        position += content.length
      }
      await output.writev(written, batchStart)
    }
    index[blockCount] = Math.ceil(position / 2 ** align)
    await output.write(makeHeader(totalBytes, align), 0, headerSize, 0)
    await output.write(Buffer.from(index.buffer), 0, index.byteLength, headerSize)
    await output.close()
    await input.close()
    await rename(partialPath, csoPath)
    return position
  } catch (error) {
    await output.close().catch(noop)
    await input.close().catch(noop)
    await rm(partialPath, { force: true })
    throw error
  }
}

/**
 * Reads the CSO at `csoPath` back, block by block, and compares it with the ISO at `isoPath`. Throws at the first
 * difference, so a CSO only replaces its ISO once it's known to hold exactly the same disc
 */
export async function checkCso(csoPath: string, isoPath: string) {
  const cso = await open(csoPath, 'r')
  const iso = await open(isoPath, 'r')
  try {
    const header = Buffer.alloc(headerSize)
    await cso.read(header, 0, headerSize, 0)
    if (header.toString('latin1', 0, 4) !== 'CISO' || header.readUInt32LE(16) !== blockSize) {
      throw new Error('Not a CSO this app wrote')
    }
    const totalBytes = Number(header.readBigUInt64LE(8))
    const align = header.readUInt8(21)
    const { size } = await iso.stat()
    if (totalBytes !== size) {
      throw new Error(`The CSO holds ${totalBytes} bytes, the ISO ${size}`)
    }
    const blockCount = Math.ceil(totalBytes / blockSize)
    const indexBuffer = Buffer.alloc((blockCount + 1) * 4)
    await cso.read(indexBuffer, 0, indexBuffer.length, headerSize)
    function entry(number: number) {
      return indexBuffer.readUInt32LE(number * 4)
    }
    function start(number: number) {
      return (entry(number) & ~plainFlag) * 2 ** align
    }

    const original = Buffer.alloc(batchSize * blockSize)
    for (let first = 0; first < blockCount; first += batchSize) {
      const last = Math.min(first + batchSize, blockCount)
      const { bytesRead } = await iso.read(original, 0, original.length, first * blockSize)
      // The batch's stored bytes, from the first block's start to the end of its last
      const from = start(first)
      const stored = Buffer.alloc(start(last) - from)
      await cso.read(stored, 0, stored.length, from)
      const blocks = await mapInGroups(
        Array.from({ length: last - first }, (_, offset) => offset),
        async (offset) => {
          const number = first + offset
          // The next block's start ends this one, with its padding, which raw deflate ignores
          const content = stored.subarray(start(number) - from, start(number + 1) - from)
          const expected = Math.min(blockSize, totalBytes - number * blockSize)
          return entry(number) & plainFlag ? content.subarray(0, expected) : await inflate(content)
        },
      )
      const restored = Buffer.concat(blocks)
      if (restored.length !== bytesRead || !restored.equals(original.subarray(0, bytesRead))) {
        throw new Error(`The CSO differs from the ISO between blocks ${first} and ${last}`)
      }
    }
  } finally {
    await cso.close()
    await iso.close()
  }
}
