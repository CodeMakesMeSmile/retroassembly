import { and, asc, eq, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { getContext } from 'hono/context-storage'
import { libraryModeEnum, romTable, statusEnum, userTable } from '#@/databases/schema.ts'
import { DomainError } from './domain-error.ts'

/**
 * Everything a controller needs to act for the signed-in user. There are two kinds of data:
 * - the library (games and their artwork) belongs to `libraryOwnerId`: the user, or the admin for an account that
 *   shares the admin's library. A shared account can read it but not change it
 * - personal data (saves, favorites, play history, settings) belongs to `user.id`, whether or not they share a library
 */
export function getLibraryScope() {
  const { currentUser, db, effectiveLibraryUserId, language, preference, storage, t } = getContext().var
  if (!currentUser) {
    throw new DomainError('unauthorized')
  }
  return {
    db: db.library,
    language,
    libraryOwnerId: effectiveLibraryUserId,
    preference,
    sharesLibrary: currentUser.libraryMode === libraryModeEnum.shared,
    storage,
    t,
    user: currentUser,
  }
}

export type LibraryScope = ReturnType<typeof getLibraryScope>

/** Refuses accounts that share someone else's library, which they may only read */
export function assertCanWriteLibrary(scope: LibraryScope) {
  if (scope.sharesLibrary) {
    throw new DomainError('forbidden', scope.t('error.sharedLibraryReadOnly'))
  }
}

/** Rows that haven't been deleted */
export function live(table: { status: SQLiteColumn }) {
  return eq(table.status, statusEnum.normal)
}

/** The games in the library the user sees */
export function romsOf(scope: LibraryScope, ...conditions: (SQL | undefined)[]) {
  return and(eq(romTable.userId, scope.libraryOwnerId), live(romTable), ...conditions)
}

/** The user's own rows of personal data */
export function ownedBy(
  scope: LibraryScope,
  table: { status: SQLiteColumn; userId: SQLiteColumn },
  ...conditions: (SQL | undefined)[]
) {
  return and(eq(table.userId, scope.user.id), live(table), ...conditions)
}

/** A game in the user's library; anyone else's is treated as not there */
export async function findRom(scope: LibraryScope, id: string) {
  const [rom] = await scope.db
    .select()
    .from(romTable)
    .where(romsOf(scope, eq(romTable.id, id)))
    .limit(1)
  if (!rom) {
    throw new DomainError('not-found', 'ROM not found')
  }
  return rom
}

/** The admin is the oldest account still in use */
export async function getAdmin(scope: Pick<LibraryScope, 'db'>) {
  const [admin] = await scope.db
    .select()
    .from(userTable)
    .where(live(userTable))
    .orderBy(asc(userTable.createdAt))
    .limit(1)
  return admin
}

export async function assertIsAdmin(scope: LibraryScope) {
  const admin = await getAdmin(scope)
  if (admin?.id !== scope.user.id) {
    throw new DomainError('forbidden')
  }
  return admin
}
