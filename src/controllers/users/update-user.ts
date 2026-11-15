import { eq } from 'drizzle-orm'
import { userTable } from '#@/databases/schema.ts'
import { DomainError } from '#@/utils/server/domain-error.ts'
import { assertIsAdmin, type LibraryScope } from '#@/utils/server/library-scope.ts'

export async function updateUser(scope: LibraryScope, { id, libraryMode }: { id: string; libraryMode: number }) {
  const superUser = await assertIsAdmin(scope)

  // Prevent modifying super user's own libraryMode
  if (id === superUser.id) {
    throw new DomainError('invalid', 'Cannot modify super user')
  }

  const [updatedUser] = await scope.db.update(userTable).set({ libraryMode }).where(eq(userTable.id, id)).returning()

  if (!updatedUser) {
    throw new DomainError('not-found', 'User not found')
  }

  return {
    id: updatedUser.id,
    libraryMode: updatedUser.libraryMode,
    username: updatedUser.username,
  }
}
