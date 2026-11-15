import { inArray } from 'drizzle-orm'
import { stateTable, statusEnum } from '#@/databases/schema.ts'
import { DomainError } from '#@/utils/server/domain-error.ts'
import { type LibraryScope, ownedBy } from '#@/utils/server/library-scope.ts'

/** Deletes the user's own saves among `ids`; anyone else's are left alone. Returns how many were deleted */
export async function deleteStates(scope: LibraryScope, ids: string[]) {
  if (ids.length === 0) {
    return 0
  }
  const states = await scope.db
    .update(stateTable)
    .set({ status: statusEnum.deleted })
    .where(ownedBy(scope, stateTable, inArray(stateTable.id, ids)))
    .returning()
  const fileIds = states.flatMap((state) => [state.fileId, state.thumbnailFileId])
  await Promise.allSettled(fileIds.map((fileId) => scope.storage.delete(fileId)))
  return states.length
}

/** Deletes one of the user's saves; anyone else's is treated as not there */
export async function deleteState(scope: LibraryScope, id: string) {
  if (!(await deleteStates(scope, [id]))) {
    throw new DomainError('not-found', 'State not found')
  }
}
