import { createHash } from 'node:crypto'
import path from 'node:path'
import { and, desc, eq, sql } from 'drizzle-orm'
import { gameSaveTable, statusEnum } from '#@/databases/schema.ts'
import { DomainError } from '#@/utils/server/domain-error.ts'
import { findRom, type LibraryScope, ownedBy } from '#@/utils/server/library-scope.ts'
import { nanoid } from '#@/utils/server/nanoid.ts'

// How many versions of a game's save are kept, newest first, so a bad save can be undone
export const keptGameSaveVersions = 10

/** The latest in-game save of a game with an emulator, to put back before the game starts */
export async function getLatestGameSave(scope: LibraryScope, { core, rom }: { core: string; rom: string }) {
  const [latest] = await scope.db
    .select()
    .from(gameSaveTable)
    .where(ownedBy(scope, gameSaveTable, eq(gameSaveTable.romId, rom), eq(gameSaveTable.core, core)))
    // Two versions can share a millisecond: the one stored last is the newer
    .orderBy(desc(gameSaveTable.createdAt), sql`rowid DESC`)
    .limit(1)
  return latest
}

/** A game's kept versions with an emulator, newest first */
export async function listGameSaves(scope: LibraryScope, { core, rom }: { core: string; rom: string }) {
  return await scope.db
    .select()
    .from(gameSaveTable)
    .where(ownedBy(scope, gameSaveTable, eq(gameSaveTable.romId, rom), eq(gameSaveTable.core, core)))
    .orderBy(desc(gameSaveTable.createdAt), sql`rowid DESC`)
    .limit(keptGameSaveVersions)
}

/**
 * Makes an older version the one in use: it's copied to the top, so the version that was in use stays in the list.
 * Restoring the version already in use changes nothing
 */
export async function restoreGameSave(scope: LibraryScope, { id }: { id: string }) {
  const [version] = await scope.db
    .select()
    .from(gameSaveTable)
    .where(ownedBy(scope, gameSaveTable, eq(gameSaveTable.id, id)))
    .limit(1)
  if (!version) {
    throw new DomainError('not-found', 'Game save not found')
  }
  const file = await scope.storage.get(version.fileId)
  if (!file) {
    throw new DomainError('not-found', 'Game save not found')
  }
  const content = await new Response(file.body).blob()
  return await createGameSave(scope, {
    core: version.core,
    file: content,
    fileType: path.extname(version.fileId).slice(1),
    rom: version.romId,
  })
}

interface CreateGameSaveParams {
  clientId?: string
  core: string
  file: Blob
  /** The file's extension, as the emulator names it: srm, or dsv for DeSmuME */
  fileType?: string
  rom: string
}

/**
 * Keeps a new version of a game's save. A save the same as the latest isn't kept again, nor one already stored under
 * the browser's id; past the newest few, older versions are let go
 */
export async function createGameSave(
  scope: LibraryScope,
  { clientId, core, file, fileType = 'srm', rom }: CreateGameSaveParams,
) {
  const romResult = await findRom(scope, rom)
  if (clientId) {
    const [sent] = await scope.db
      .select()
      .from(gameSaveTable)
      .where(and(eq(gameSaveTable.userId, scope.user.id), eq(gameSaveTable.clientId, clientId)))
      .limit(1)
    if (sent) {
      return sent
    }
  }

  const content = new Uint8Array(await file.arrayBuffer())
  const sha1 = createHash('sha1').update(content).digest('hex')
  const latest = await getLatestGameSave(scope, { core, rom: romResult.id })
  if (latest?.sha1 === sha1) {
    return latest
  }

  const id = nanoid()
  const extension = /^[a-z\d]{1,8}$/u.test(fileType) ? fileType : 'srm'
  const fileId = path.join('game-saves', scope.user.id, romResult.platform, romResult.id, `${id}.${extension}`)
  await scope.storage.put(fileId, new Blob([content]))
  let saved: typeof gameSaveTable.$inferSelect
  try {
    ;[saved] = await scope.db
      .insert(gameSaveTable)
      .values({
        clientId,
        core,
        fileId,
        id,
        platform: romResult.platform,
        romId: romResult.id,
        sha1,
        size: content.byteLength,
        userId: scope.user.id,
      })
      .returning()
  } catch (error) {
    // The same upload arrived twice at once, and the other copy was kept first
    await Promise.allSettled([scope.storage.delete(fileId)])
    const [sent] = clientId
      ? await scope.db
          .select()
          .from(gameSaveTable)
          .where(and(eq(gameSaveTable.userId, scope.user.id), eq(gameSaveTable.clientId, clientId)))
          .limit(1)
      : []
    if (!sent) {
      throw error
    }
    return sent
  }

  const older = await scope.db
    .select()
    .from(gameSaveTable)
    .where(ownedBy(scope, gameSaveTable, eq(gameSaveTable.romId, romResult.id), eq(gameSaveTable.core, core)))
    // Two versions can share a millisecond: the one stored last is the newer
    .orderBy(desc(gameSaveTable.createdAt), sql`rowid DESC`)
    .limit(1000)
    .offset(keptGameSaveVersions)
  for (const version of older) {
    await scope.db.update(gameSaveTable).set({ status: statusEnum.deleted }).where(eq(gameSaveTable.id, version.id))
    await Promise.allSettled([scope.storage.delete(version.fileId)])
  }
  return saved
}
