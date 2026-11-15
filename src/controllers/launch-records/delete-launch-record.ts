import { and, eq } from 'drizzle-orm'
import { launchRecordTable, statusEnum } from '#@/databases/schema.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'

interface DeleteRomParams {
  rom: string
}

export async function deleteLaunchRecord(scope: LibraryScope, params: DeleteRomParams) {
  const { user: currentUser } = scope
  const library = scope.db

  const result = await library
    .update(launchRecordTable)
    .set({ status: statusEnum.deleted })
    .where(
      and(
        eq(launchRecordTable.romId, params.rom),
        eq(launchRecordTable.userId, currentUser.id),
        eq(launchRecordTable.status, statusEnum.normal),
      ),
    )
    .returning()

  return result
}
