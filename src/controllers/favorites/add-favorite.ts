import { and, eq } from 'drizzle-orm'
import { favoriteTable, statusEnum } from '#@/databases/schema.ts'
import { findRom, type LibraryScope } from '#@/utils/server/library-scope.ts'

export async function addFavorite(scope: LibraryScope, romId: string) {
  await findRom(scope, romId)
  const { user: currentUser } = scope
  const library = scope.db

  const [existing] = await library
    .select()
    .from(favoriteTable)
    .where(and(eq(favoriteTable.userId, currentUser.id), eq(favoriteTable.romId, romId)))

  if (existing && existing.status === statusEnum.normal) {
    return existing
  }

  if (existing) {
    const [result] = await library
      .update(favoriteTable)
      .set({ status: statusEnum.normal })
      .where(eq(favoriteTable.id, existing.id))
      .returning()
    return result
  }

  const [result] = await library
    .insert(favoriteTable)
    .values({
      romId,
      userId: currentUser.id,
    })
    .returning()

  return result
}
