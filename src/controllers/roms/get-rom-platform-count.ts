import { and, eq, inArray, sql } from 'drizzle-orm'
import { romTable, statusEnum } from '#@/databases/schema.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'

export async function getRomPlatformCount(scope: LibraryScope) {
  const { libraryOwnerId: effectiveLibraryUserId, preference } = scope
  const library = scope.db

  const [{ count }] = await library
    .select({ count: sql<number>`COUNT(DISTINCT ${romTable.platform})` })
    .from(romTable)
    .where(
      and(
        eq(romTable.userId, effectiveLibraryUserId),
        eq(romTable.status, statusEnum.normal),
        inArray(romTable.platform, preference.ui.platforms),
      ),
    )

  return count
}
