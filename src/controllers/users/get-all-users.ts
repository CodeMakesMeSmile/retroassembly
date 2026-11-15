import { asc, eq } from 'drizzle-orm'
import { sessionTable, statusEnum, userTable } from '#@/databases/schema.ts'
import { assertIsAdmin, type LibraryScope } from '#@/utils/server/library-scope.ts'

export async function getAllUsers(scope: LibraryScope) {
  const superUser = await assertIsAdmin(scope)

  // Get all users with their most recent activity
  const users = await scope.db
    .select({
      createdAt: userTable.createdAt,
      id: userTable.id,
      lastActivityAt: sessionTable.lastActivityAt,
      libraryMode: userTable.libraryMode,
      username: userTable.username,
    })
    .from(userTable)
    .leftJoin(sessionTable, eq(sessionTable.userId, userTable.id))
    .where(eq(userTable.status, statusEnum.normal))
    .orderBy(asc(userTable.createdAt))

  // Group by user and get the most recent activity
  const userMap = new Map<string, (typeof users)[0]>()
  for (const user of users) {
    const existing = userMap.get(user.id)
    if (
      !existing ||
      (user.lastActivityAt && (!existing.lastActivityAt || user.lastActivityAt > existing.lastActivityAt))
    ) {
      userMap.set(user.id, user)
    }
  }

  const groupedUsers = [...userMap.values()].map((user) => ({
    createdAt: user.createdAt,
    id: user.id,
    isSuper: user.id === superUser.id,
    lastActivityAt: user.lastActivityAt,
    libraryMode: user.libraryMode,
    username: user.username,
  }))

  return groupedUsers
}
