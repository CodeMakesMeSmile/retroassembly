import path from 'node:path'
import { and, desc, eq } from 'drizzle-orm'
import { getRunTimeEnv } from '#@/constants/env.ts'
import { stateTable, statusEnum } from '#@/databases/schema.ts'
import { findRom, type LibraryScope } from '#@/utils/server/library-scope.ts'
import { nanoid } from '#@/utils/server/nanoid.ts'
import { deleteStates } from './delete-states.ts'

interface CreateStateParams {
  /** The browser's id for this save; a save already stored under it isn't stored again */
  clientId?: string
  core: string
  disc?: number
  rom: string
  state: Blob
  thumbnail: Blob
  type: 'auto' | 'manual'
}

async function findByClientId(scope: LibraryScope, clientId: string) {
  const [existing] = await scope.db
    .select()
    .from(stateTable)
    .where(and(eq(stateTable.userId, scope.user.id), eq(stateTable.clientId, clientId)))
    .limit(1)
  return existing
}

export async function createState(
  scope: LibraryScope,
  { clientId, core, disc, rom, state, thumbnail, type }: CreateStateParams,
) {
  const { user: currentUser, storage } = scope
  const romResult = await findRom(scope, rom)
  // The same save sent again, for example after the connection dropped before the answer arrived
  const existing = clientId ? await findByClientId(scope, clientId) : undefined
  if (existing) {
    return existing
  }

  const id = nanoid()
  const stateFileId = path.join('states', currentUser.id, romResult.platform, rom, `${id}.state`)
  await storage.put(stateFileId, state)
  const thumbnailFileId = path.join('states', currentUser.id, romResult.platform, rom, `${id}.png`)
  await storage.put(thumbnailFileId, thumbnail)

  let stateResult: typeof stateTable.$inferSelect
  try {
    ;[stateResult] = await scope.db
      .insert(stateTable)
      .values({
        clientId,
        core,
        disc,
        fileId: stateFileId,
        platform: romResult.platform,
        romId: romResult.id,
        thumbnailFileId,
        type,
        userId: currentUser.id,
      })
      .returning()
  } catch (error) {
    // The same save arrived twice at once and the other copy was stored first: keep that one
    const stored = clientId ? await findByClientId(scope, clientId) : undefined
    if (!stored) {
      throw error
    }
    await Promise.allSettled([storage.delete(stateFileId), storage.delete(thumbnailFileId)])
    return stored
  }

  if (type === 'auto') {
    const existingAutoStates = await scope.db
      .select()
      .from(stateTable)
      .where(
        and(
          eq(stateTable.userId, currentUser.id),
          eq(stateTable.romId, romResult.id),
          eq(stateTable.status, statusEnum.normal),
          eq(stateTable.type, 'auto'),
        ),
      )
      .orderBy(desc(stateTable.createdAt))
    const maxAutoStates = Math.trunc(Number(getRunTimeEnv().RETROASSEMBLY_RUN_TIME_MAX_AUTO_STATES_PER_ROM)) || 20
    if (existingAutoStates.length > maxAutoStates) {
      const idsToDelete = existingAutoStates.slice(maxAutoStates).map((s) => s.id)
      await deleteStates(scope, idsToDelete)
    }
  }

  return stateResult
}
