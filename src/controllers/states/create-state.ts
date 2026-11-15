import path from 'node:path'
import { and, desc, eq } from 'drizzle-orm'
import { getRunTimeEnv } from '#@/constants/env.ts'
import { stateTable, statusEnum } from '#@/databases/schema.ts'
import { findRom, type LibraryScope } from '#@/utils/server/library-scope.ts'
import { nanoid } from '#@/utils/server/nanoid.ts'
import { deleteStates } from './delete-states.ts'

interface CreateStateParams {
  core: string
  rom: string
  state: Blob
  thumbnail: Blob
  type: 'auto' | 'manual'
}

export async function createState(scope: LibraryScope, { core, rom, state, thumbnail, type }: CreateStateParams) {
  const { user: currentUser, storage } = scope
  const romResult = await findRom(scope, rom)

  const id = nanoid()
  const stateFileId = path.join('states', currentUser.id, romResult.platform, rom, `${id}.state`)
  await storage.put(stateFileId, state)
  const thumbnailFileId = path.join('states', currentUser.id, romResult.platform, rom, `${id}.png`)
  await storage.put(thumbnailFileId, thumbnail)

  const [stateResult] = await scope.db
    .insert(stateTable)
    .values({
      core,
      fileId: stateFileId,
      platform: romResult.platform,
      romId: romResult.id,
      thumbnailFileId,
      type,
      userId: currentUser.id,
    })
    .returning()

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
