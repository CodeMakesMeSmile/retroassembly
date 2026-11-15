import { and, eq } from 'drizzle-orm'
import { sessionTable, statusEnum, userTable } from '#@/databases/schema.ts'
import { DomainError } from '#@/utils/server/domain-error.ts'
import { assertIsAdmin, type LibraryScope } from '#@/utils/server/library-scope.ts'

export async function deleteUser(scope: LibraryScope, userIdToDelete: string) {
  const { user: currentUser } = scope

  const superUser = await assertIsAdmin(scope)

  // Prevent self-deletion
  if (userIdToDelete === currentUser.id) {
    throw new DomainError('invalid', 'Cannot delete yourself')
  }

  // Prevent deleting super user
  if (userIdToDelete === superUser.id) {
    throw new DomainError('invalid', 'Cannot delete super user')
  }

  // Soft delete user (set status to deleted)
  await scope.db.update(userTable).set({ status: statusEnum.deleted }).where(eq(userTable.id, userIdToDelete))

  // Invalidate all sessions for this user
  await scope.db
    .update(sessionTable)
    .set({ status: statusEnum.deleted })
    .where(and(eq(sessionTable.userId, userIdToDelete), eq(sessionTable.status, statusEnum.normal)))
}
