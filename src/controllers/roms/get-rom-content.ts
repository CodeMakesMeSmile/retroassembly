import { findRom, type LibraryScope } from '#@/utils/server/library-scope.ts'
import { getFileContent } from '#@/utils/server/misc.ts'

export async function getRomContent(scope: LibraryScope, id: string) {
  const rom = await findRom(scope, id)
  return getFileContent(rom.fileId)
}
