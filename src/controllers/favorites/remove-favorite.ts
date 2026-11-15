import { and, eq } from 'drizzle-orm'
import { favoriteTable, statusEnum } from '#@/databases/schema.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'

export async function removeFavorite(scope: LibraryScope, romId: string) {
  const { user: currentUser } = scope
  const library = scope.db

  const result = await library
    .update(favoriteTable)
    .set({ status: statusEnum.deleted })
    .where(
      and(
        eq(favoriteTable.romId, romId),
        eq(favoriteTable.userId, currentUser.id),
        eq(favoriteTable.status, statusEnum.normal),
      ),
    )
    .returning()

  return result
}
