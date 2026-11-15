import { and, eq } from 'drizzle-orm'
import { romTable, statusEnum } from '#@/databases/schema.ts'
import { getFileKind } from '#@/utils/server/file-kind.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'

// Whether the signed-in user may read a stored file: their own, or, for a user who shares another's library, that
// library's ROMs and box art. Save states and BIOS settings are each user's own.
export async function canReadFile(scope: LibraryScope, id: string) {
  const { user: currentUser, libraryOwnerId: effectiveLibraryUserId, preference } = scope
  const file = getFileKind(id)
  switch (file?.kind) {
    case 'attachment':
      return file.userId === currentUser.id || file.userId === effectiveLibraryUserId
    case 'bios':
      return Object.values(preference.emulator.platform).some((platform) =>
        platform?.bioses?.some((bios) => bios.fileId === id),
      )
    case 'rom': {
      const [rom] = await scope.db
        .select({ id: romTable.id })
        .from(romTable)
        .where(
          and(
            eq(romTable.fileId, id),
            eq(romTable.userId, effectiveLibraryUserId),
            eq(romTable.status, statusEnum.normal),
          ),
        )
        .limit(1)
      return Boolean(rom)
    }
    case 'state':
      return file.userId === currentUser.id
    default:
      return false
  }
}
