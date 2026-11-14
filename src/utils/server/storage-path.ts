import path from 'node:path'

/**
 * The path on disk of a stored file, or undefined if its id would reach outside the storage directory. Ids come from
 * request URLs, where "..%2F" arrives as "../", so an id like "../retroassembly.sqlite" must not be read or written.
 */
export function getStoragePath(storageDirectory: string, id: string) {
  const root = path.resolve(storageDirectory)
  const filePath = path.resolve(root, id)
  const relative = path.relative(root, filePath)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return
  }
  return filePath
}
