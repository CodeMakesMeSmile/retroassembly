// What a stored file is, read from its id, which says who it belongs to:
// - roms/<platform>/<md5><ext>: a ROM, kept once however many users upload it, so it belongs to whoever has it in
//   their library
// - bioses/<platform>/<md5><ext>: a BIOS, likewise kept once, belonging to whoever has it in their settings
// - attachments/<user id>/...: a game's box art or screenshots, added by that user to their library
// - states/<user id>/...: that user's saved state and its thumbnail
// An id with an empty, "." or ".." part, a backslash, or another first folder isn't a file this app stores.
export type FileKind =
  | { kind: 'attachment'; userId: string }
  | { kind: 'bios' }
  | { kind: 'rom' }
  | { kind: 'state'; userId: string }

export function getFileKind(id: string): FileKind | undefined {
  if (id.includes('\\')) {
    return
  }
  const parts = id.split('/')
  if (parts.length < 3 || parts.some((part) => !part || part === '.' || part === '..')) {
    return
  }
  const [folder, userId] = parts
  switch (folder) {
    case 'attachments':
      return { kind: 'attachment', userId }
    case 'bioses':
      return { kind: 'bios' }
    case 'roms':
      return { kind: 'rom' }
    case 'states':
      return { kind: 'state', userId }
    default:
  }
}
