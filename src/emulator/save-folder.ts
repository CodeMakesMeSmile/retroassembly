// A game's own saves kept as a folder of files (the PSP's memory stick saves) are stored as one zip. The zip is written
// here by hand: uncompressed, its files in name order and with one fixed date, so the same saves always make the same
// bytes (an unchanged save isn't uploaded again), and synchronously, so it can be read in the moment a page is hidden.
// Zips from elsewhere, like PPSSPP's SAVEDATA folder zipped on a computer, are read with zip.js, compressed or not

export type SaveFiles = [path: string, content: Uint8Array][]

/* eslint-disable no-bitwise -- the zip format's CRC-32 and DOS date are bit fields */

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xed_b8_83_20 ^ (crc >>> 1) : crc >>> 1
  }
  return crc >>> 0
})

function crc32(content: Uint8Array) {
  let crc = 0xff_ff_ff_ff
  for (const byte of content) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0
}

// 1 January 1980, the earliest date a zip can hold, for every file
const dosTime = 0
const dosDate = (1 << 5) | 1
/* eslint-enable no-bitwise */

/** The files as an uncompressed zip, the same bytes for the same files */
export function zipSaveFiles(files: SaveFiles) {
  const encoder = new TextEncoder()
  const sorted = files.toSorted(([a], [b]) => {
    if (a === b) {
      return 0
    }
    return a < b ? -1 : 1
  })
  const local: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [path, content] of sorted) {
    const name = encoder.encode(path)
    const crc = crc32(content)
    const header = new DataView(new ArrayBuffer(30))
    header.setUint32(0, 0x04_03_4b_50, true)
    header.setUint16(4, 20, true)
    // Bit 11: the name is UTF-8
    header.setUint16(6, 0x08_00, true)
    header.setUint16(8, 0, true)
    header.setUint16(10, dosTime, true)
    header.setUint16(12, dosDate, true)
    header.setUint32(14, crc, true)
    header.setUint32(18, content.length, true)
    header.setUint32(22, content.length, true)
    header.setUint16(26, name.length, true)
    header.setUint16(28, 0, true)
    local.push(new Uint8Array(header.buffer), name, content)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02_01_4b_50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x08_00, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, dosTime, true)
    entry.setUint16(14, dosDate, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, content.length, true)
    entry.setUint32(24, content.length, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), name)
    offset += 30 + name.length + content.length
  }
  const centralSize = central.reduce((size, part) => size + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06_05_4b_50, true)
  end.setUint16(8, sorted.length, true)
  end.setUint16(10, sorted.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const parts = [...local, ...central, new Uint8Array(end.buffer)]
  const zip = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  let position = 0
  for (const part of parts) {
    zip.set(part, position)
    position += part.length
  }
  return zip
}

/**
 * The files in a zip of saves. A zip made of the whole folder, with the folder's own name at the start of every path
 * (`SAVEDATA/…`), is read as the folder's contents
 */
export async function unzipSaveFiles(zip: Uint8Array, folderName: string) {
  const { BlobReader, Uint8ArrayWriter, ZipReader } = await import('@zip.js/zip.js')
  const reader = new ZipReader(new BlobReader(new Blob([new Uint8Array(zip)])))
  try {
    const allEntries = await reader.getEntries()
    const entries = allEntries.filter((entry) => !entry.directory)
    const prefix = `${folderName}/`
    const wrapped = entries.length > 0 && entries.every(({ filename }) => filename.startsWith(prefix))
    const files: SaveFiles = []
    for (const entry of entries) {
      const content = await entry.getData?.(new Uint8ArrayWriter())
      const path = wrapped ? entry.filename.slice(prefix.length) : entry.filename
      // Nothing outside the folder: no absolute paths or steps up
      if (content && path && !path.startsWith('/') && !path.split('/').includes('..')) {
        files.push([path, content])
      }
    }
    return files
  } finally {
    await reader.close()
  }
}
