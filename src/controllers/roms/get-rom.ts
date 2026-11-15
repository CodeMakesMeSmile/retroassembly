import { and, eq } from 'drizzle-orm'
import type { PlatformName } from '#@/constants/platform.ts'
import { romTable, statusEnum } from '#@/databases/schema.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'
import { getRoms } from './get-roms.ts'

export async function getRom(
  scope: LibraryScope,
  params: { fileName: string; platform: PlatformName } | { id: string },
) {
  if ('id' in params) {
    const {
      roms: [rom],
    } = await getRoms(scope, { id: params.id })
    return rom
  }

  const { fileName, platform } = params
  const { libraryOwnerId: effectiveLibraryUserId } = scope
  const [result] = await scope.db
    .select({ id: romTable.id })
    .from(romTable)
    .orderBy(romTable.fileName)
    .where(
      and(
        eq(romTable.fileName, fileName),
        eq(romTable.platform, platform),
        eq(romTable.userId, effectiveLibraryUserId),
        eq(romTable.status, statusEnum.normal),
      ),
    )
  if (result) {
    return getRom(scope, { id: result.id })
  }
}
