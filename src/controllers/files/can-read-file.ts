import { and, eq } from 'drizzle-orm'
import { getContext } from 'hono/context-storage'
import { romTable, statusEnum } from '#@/databases/schema.ts'
import { getFileKind } from '#@/utils/server/file-kind.ts'

// Whether the signed-in user may read a stored file: their own, or, for a user who shares another's library, that
// library's ROMs and box art. Save states and BIOS settings are each user's own.
export async function canReadFile(id: string) {
  const { currentUser, db, effectiveLibraryUserId, preference } = getContext().var
  const file = getFileKind(id)
  switch (file?.kind) {
    case 'attachment':
      return file.userId === currentUser.id || file.userId === effectiveLibraryUserId
    case 'bios':
      return Object.values(preference.emulator.platform).some((platform) =>
        platform?.bioses?.some((bios) => bios.fileId === id),
      )
    case 'rom': {
      const [rom] = await db.library
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
