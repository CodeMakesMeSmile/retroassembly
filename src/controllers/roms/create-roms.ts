import path from 'node:path'
import { and, eq, type InferInsertModel } from 'drizzle-orm'
import { isNotNil, pickBy, omit } from 'es-toolkit'
import { DateTime } from 'luxon'
import { getRunTimeEnv } from '#@/constants/env.ts'
import { platformMap, type PlatformName } from '#@/constants/platform.ts'
import { romTable, statusEnum } from '#@/databases/schema.ts'
import { DomainError } from '#@/utils/server/domain-error.ts'
import { getFilePartialDigest } from '#@/utils/server/file.ts'
import { assertCanWriteLibrary, type LibraryScope } from '#@/utils/server/library-scope.ts'
import { msleuth } from '#@/utils/server/msleuth.ts'
import { countRoms } from './count-roms.ts'

function getGenres({ launchbox, libretro }) {
  return (
    launchbox?.genres
      ?.split(';')
      .map((genre) => genre.trim())
      .join(',') ||
    libretro?.genres
      ?.split(',')
      .map((genre) => genre.trim())
      .join(',')
  )
}

function getReleaseDate({ launchbox }) {
  if (launchbox?.releaseDate) {
    const date = DateTime.fromISO(launchbox.releaseDate)
    if (date.isValid) {
      return date.toJSDate()
    }
  }
}

function getReleaseYear({ launchbox, libretro }) {
  if (launchbox) {
    if (launchbox.releaseYear) {
      const result = Math.trunc(Number(launchbox.releaseYear || ''))
      if (result) {
        return result
      }
    }

    if (launchbox.releaseDate) {
      const result = new Date(launchbox.releaseDate).getFullYear()
      if (result) {
        return result
      }
    }
  }

  if (libretro) {
    const result = Math.trunc(Number(libretro.releaseyear || ''))
    if (result) {
      return result
    }
  }
}

export async function createRom(
  scope: LibraryScope,
  { file, md5, platform }: { file: File; md5?: string; platform: PlatformName },
) {
  const env = getRunTimeEnv()
  const { user: currentUser, storage, t } = scope
  const library = scope.db

  assertCanWriteLibrary(scope)

  const maxRomCount = Math.trunc(Number(env.RETROASSEMBLY_RUN_TIME_MAX_ROM_COUNT)) || Infinity
  const romCount = await countRoms(scope)
  if (romCount + 1 > maxRomCount) {
    throw new DomainError('invalid', t('error.exceedMaxRomCount', { maxRomCount }))
  }

  const ext = path.parse(file.name).ext.toLowerCase()
  if (!platformMap[platform].fileExtensions.includes(ext)) {
    throw new DomainError('invalid', `File extension ${ext} is not supported for platform ${platform}`)
  }

  // Look up game info
  let gameInfo: Record<string, any> = {}
  try {
    const gameInfoList = await msleuth.identify({
      files: [{ md5: md5 || '', name: file.name }],
      platform,
    })
    gameInfo = gameInfoList?.[0] || {}
  } catch (error) {
    console.warn(error)
  }

  for (const key of Object.keys(gameInfo)) {
    const item = gameInfo[key]
    if (item && typeof item === 'object') {
      gameInfo[key] = pickBy(item, (value) => isNotNil(value))
    }
  }

  const { launchbox, libretro } = gameInfo

  // Store file
  const digest = await getFilePartialDigest(file)
  const fileId = path.join('roms', platform, `${digest}${ext}`)
  const fileExists = await storage.head(fileId)
  if (!fileExists) {
    await storage.put(fileId, file)
  }

  const romData: InferInsertModel<typeof romTable> = {
    fileId,
    fileName: file.name,
    gameDeveloper: launchbox?.developer || libretro?.developer,
    gameGenres: getGenres({ launchbox, libretro }),
    gameName: launchbox?.name || libretro?.name,
    gamePlayers: launchbox?.maxPlayers || libretro?.users,
    gamePublisher: launchbox?.publisher || libretro?.publisher,
    gameReleaseDate: getReleaseDate({ launchbox }),
    gameReleaseYear: getReleaseYear({ launchbox, libretro }),
    launchboxGameId: launchbox?.databaseId,
    libretroGameId: libretro?.id,
    platform,
    rawGameMetadata: launchbox || libretro ? { launchbox, libretro } : undefined,
    userId: currentUser.id,
  }

  // Check for existing ROM with same fileName + platform
  const [existingRom] = await library
    .select()
    .from(romTable)
    .where(
      and(
        eq(romTable.userId, currentUser.id),
        eq(romTable.platform, platform),
        eq(romTable.status, statusEnum.normal),
        eq(romTable.fileName, file.name),
      ),
    )
    .limit(1)

  if (existingRom) {
    const updateData = omit(romData, ['id'])
    const [result] = await library.update(romTable).set(updateData).where(eq(romTable.id, existingRom.id)).returning()
    return result
  }

  const [result] = await library.insert(romTable).values(romData).returning()
  return result
}
