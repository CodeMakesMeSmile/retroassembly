import {
  dataOffset,
  type ReadMessage,
  readState,
  type StoreMessage,
  type WorkerReply,
} from './game-storage-protocol.ts'

// Games kept in the browser's storage, on the device's disk, instead of in the page's memory: the emulator reads the
// part of the disc it needs as it plays. A cache: the NAS keeps the real copy, and the browser may clear it any time

/** The most the stored games may take together; the least recently played go to make room */
const storageLimit = 4 * 1024 ** 3
const indexKey = 'retroassembly:stored-games'
// The most read at once through shared memory; larger reads take several turns
const readChunk = 4 * 1024 * 1024

interface StoredGame {
  /** The NAS's tag for the version stored, to tell when it's changed */
  etag?: string
  lastPlayed: number
  size: number
}

/** Whether this browser can keep games in storage and read them as they play: on pages isolated for threads */
export function canStoreGames() {
  return (
    globalThis.crossOriginIsolated &&
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function'
  )
}

/** The name a game file is stored under */
export function getStoredName(fileId: string) {
  return fileId.replaceAll(/[^\w.-]/gu, '_')
}

function readIndex(): Record<string, StoredGame> {
  try {
    return JSON.parse(localStorage.getItem(indexKey) || '{}') as Record<string, StoredGame>
  } catch {
    return {}
  }
}

function writeIndex(index: Record<string, StoredGame>) {
  try {
    localStorage.setItem(indexKey, JSON.stringify(index))
  } catch {}
}

async function getDirectory() {
  const root = await navigator.storage.getDirectory()
  return await root.getDirectoryHandle('games', { create: true })
}

/**
 * Whether the game at `url` is stored in full, and is the version the NAS has. Without a connection to ask, the stored
 * copy is used as it is
 */
export async function hasStoredGame(name: string, url: string) {
  const entry = readIndex()[name]
  if (!entry) {
    return false
  }
  try {
    const file = await (await (await getDirectory()).getFileHandle(name)).getFile()
    if (file.size !== entry.size) {
      forget(name)
      return false
    }
  } catch {
    forget(name)
    return false
  }
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const etag = response.headers.get('ETag')
    if (response.ok && etag && entry.etag && etag !== entry.etag) {
      forget(name)
      return false
    }
  } catch {}
  return true
}

function forget(name: string) {
  const index = readIndex()
  delete index[name]
  writeIndex(index)
}

/** Removes the least recently played games until those left fit the limit, never `keep` */
async function makeRoom(keep: string, needed = 0) {
  const index = readIndex()
  const directory = await getDirectory()
  const others = Object.entries(index)
    .filter(([name]) => name !== keep)
    .toSorted(([, a], [, b]) => a.lastPlayed - b.lastPlayed)
  let total = Object.values(index).reduce((sum, { size }) => sum + size, 0) + needed
  for (const [name, { size }] of others) {
    if (total <= storageLimit) {
      break
    }
    await directory.removeEntry(name).catch(() => {})
    delete index[name]
    total -= size
  }
  writeIndex(index)
  // Files the index doesn't know, from downloads cut short
  for await (const name of (directory as unknown as { keys: () => AsyncIterable<string> }).keys()) {
    if (!index[name] && name !== keep) {
      await directory.removeEntry(name).catch(() => {})
    }
  }
}

/** Marks a stored game as just played, so it's the last to be removed */
export function markPlayed(name: string) {
  const index = readIndex()
  if (index[name]) {
    index[name].lastPlayed = Date.now()
    writeIndex(index)
  }
}

function startWorker() {
  return new Worker(new URL('game-storage.worker.ts', import.meta.url), { type: 'module' })
}

/** Downloads a game into storage, never holding it whole in memory. Resolves with its size */
export async function storeGame(
  name: string,
  url: string,
  onProgress?: (loaded: number, total: number | undefined) => void,
) {
  forget(name)
  function attempt() {
    return new Promise<{ etag?: string; size: number }>((resolve, reject) => {
      const worker = startWorker()
      worker.addEventListener('message', ({ data }: MessageEvent<WorkerReply>) => {
        if (data.type === 'progress') {
          onProgress?.(data.loaded, data.total)
        } else if (data.type === 'stored') {
          worker.terminate()
          resolve({ etag: data.etag, size: data.size })
        } else if (data.type === 'error') {
          worker.terminate()
          reject(new Error(data.error))
        }
      })
      worker.addEventListener('error', (event) => {
        worker.terminate()
        reject(new Error(event.message))
      })
      worker.postMessage({ name, type: 'store', url } satisfies StoreMessage, [])
    })
  }
  let stored: { etag?: string; size: number }
  try {
    stored = await attempt()
  } catch (error) {
    // Out of space: the other games go, and it's tried once more
    if (!String(error).includes('QuotaExceeded')) {
      throw error
    }
    await makeRoom(name, Number.POSITIVE_INFINITY)
    stored = await attempt()
  }
  writeIndex({ ...readIndex(), [name]: { ...stored, lastPlayed: Date.now() } })
  await makeRoom(name).catch(() => {})
  return stored.size
}

/** Reads a stored game as the emulator asks, blocking until each read is answered, which takes well under a millisecond */
export interface GameReader {
  close: () => void
  read: (target: Int8Array | Uint8Array, offset: number, position: number, length: number) => number
  size: number
}

export async function openGameReader(name: string): Promise<GameReader> {
  const buffer = new SharedArrayBuffer(dataOffset + readChunk)
  const control = new Int32Array(buffer, 0, 4)
  const position = new Float64Array(buffer, 16, 1)
  const data = new Uint8Array(buffer, dataOffset)
  const worker = startWorker()
  const size = await new Promise<number>((resolve, reject) => {
    worker.addEventListener('message', ({ data }: MessageEvent<WorkerReply>) => {
      if (data.type === 'ready') {
        resolve(data.size)
      } else if (data.type === 'error') {
        reject(new Error(data.error))
      }
    })
    worker.addEventListener('error', (event) => reject(new Error(event.message)))
    worker.postMessage({ buffer, name, type: 'read' } satisfies ReadMessage, [])
  })

  function request(at: number, length: number) {
    position[0] = at
    Atomics.store(control, 1, length)
    Atomics.store(control, 0, readState.request)
    Atomics.notify(control, 0)
    // The page can't sleep while it waits, so it checks until the answer is there
    while (Atomics.load(control, 0) !== readState.done) {
      // waiting
    }
    const failed = Atomics.load(control, 3) !== 0
    const count = Atomics.load(control, 2)
    Atomics.store(control, 0, readState.idle)
    if (failed) {
      throw new Error('Reading the stored game failed')
    }
    return count
  }

  let closed = false
  return {
    close() {
      if (!closed) {
        closed = true
        position[0] = 0
        Atomics.store(control, 1, -1)
        Atomics.store(control, 0, readState.request)
        Atomics.notify(control, 0)
        setTimeout(() => worker.terminate(), 1000)
      }
    },
    read(target, offset, at, length) {
      let done = 0
      while (done < length) {
        const count = request(at + done, Math.min(length - done, readChunk))
        if (count === 0) {
          break
        }
        // Copied as bytes, whatever kind of array the emulator's memory is viewed through
        new Uint8Array(target.buffer, target.byteOffset + offset + done, count).set(data.subarray(0, count))
        done += count
      }
      return done
    },
    size,
  }
}
