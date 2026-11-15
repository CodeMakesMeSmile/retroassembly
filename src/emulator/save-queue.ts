import { client } from '#@/api/client.ts'

// Every save goes through this queue: it's kept in the browser until the server has it, so a save survives a dropped
// connection or the browser closing the tab mid-upload, and is uploaded the next time the library opens. Each save has
// an id made here, so uploading it again can't store it twice

export interface QueuedSave {
  core: string
  id: string
  rom: string
  savedAt: number
  state: Blob
  thumbnail: Blob
  type: 'auto' | 'manual'
}

/** Where queued saves are kept: IndexedDB in the browser, memory in tests */
export interface SaveStore {
  delete: (id: string) => Promise<void>
  getAll: () => Promise<QueuedSave[]>
  put: (save: QueuedSave) => Promise<void>
}

/** Sends a save to the server; throws if it isn't stored */
export type SaveUploader = (save: QueuedSave) => Promise<void>

const databaseName = 'retroassembly-pending-saves'
// Version 1 kept one save per game, under the game's id, in "saves"; version 2 keeps every save, under its own id
const storeName = 'queue'
const oldStoreName = 'saves'

function newId() {
  return globalThis.crypto.randomUUID()
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      const queue = database.createObjectStore(storeName, { keyPath: 'id' })
      if (!database.objectStoreNames.contains(oldStoreName)) {
        return
      }
      // Saves left from before are moved over as auto saves
      const old = request.transaction?.objectStore(oldStoreName).getAll()
      old?.addEventListener('success', () => {
        for (const save of old.result as Omit<QueuedSave, 'id' | 'type'>[]) {
          queue.put({ ...save, id: newId(), type: 'auto' })
        }
        database.deleteObjectStore(oldStoreName)
      })
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(new Error(request.error?.message ?? 'IndexedDB request failed')))
  })
}

async function runInStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(database.transaction(storeName, mode).objectStore(storeName))
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => reject(new Error(request.error?.message ?? 'IndexedDB request failed')))
    })
  } finally {
    database.close()
  }
}

export const indexedDBSaveStore: SaveStore = {
  async delete(id) {
    await runInStore('readwrite', (store) => store.delete(id))
  },
  getAll: () => runInStore<QueuedSave[]>('readonly', (store) => store.getAll()),
  async put(save) {
    await runInStore('readwrite', (store) => store.put(save))
  },
}

export async function uploadSaveToServer({ core, id, rom, state, thumbnail, type }: QueuedSave) {
  // @ts-expect-error the hono client accepts blobs as form values, though its types only list files
  const response = await client.states.$post({ form: { clientId: id, core, rom, state, thumbnail, type } })
  if (!response.ok) {
    throw new Error(`Failed to upload the save: ${response.status}`)
  }
}

export function createSaveQueue(store: SaveStore = indexedDBSaveStore, upload: SaveUploader = uploadSaveToServer) {
  async function remove(save: QueuedSave) {
    try {
      await store.delete(save.id)
    } catch {}
  }

  /**
   * Queues a save and uploads it. Only the newest auto save of a game is worth keeping, so older ones waiting to upload
   * are dropped; manual saves are all kept. If the upload fails, the save stays queued and the error is thrown.
   */
  async function save(input: Omit<QueuedSave, 'id' | 'savedAt'>) {
    const queued: QueuedSave = { ...input, id: newId(), savedAt: Date.now() }
    // Kept first, before anything else, so a tab closed right after a save on hide still has it
    try {
      await store.put(queued)
    } catch {}
    if (queued.type === 'auto') {
      try {
        const waiting = await store.getAll()
        const older = waiting.filter(({ id, rom, type }) => type === 'auto' && rom === queued.rom && id !== queued.id)
        await Promise.all(older.map((old) => remove(old)))
      } catch {}
    }
    await upload(queued)
    await remove(queued)
    return queued
  }

  /** Uploads every save still waiting, oldest first. Returns how many it uploaded */
  async function flush() {
    let waiting: QueuedSave[]
    try {
      waiting = await store.getAll()
    } catch {
      return 0
    }
    let uploaded = 0
    for (const queued of waiting.toSorted((a, b) => a.savedAt - b.savedAt)) {
      try {
        await upload(queued)
        await remove(queued)
        uploaded += 1
      } catch {}
    }
    return uploaded
  }

  return { flush, save }
}

export const saveQueue = createSaveQueue()
