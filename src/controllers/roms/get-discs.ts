import { and, asc, eq } from 'drizzle-orm'
import type { PlatformName } from '#@/constants/platform.ts'
import { romTable } from '#@/databases/schema.ts'
import { type LibraryScope, romsOf } from '#@/utils/server/library-scope.ts'

export interface Disc {
  fileId: string
  fileName: string
  id: string
  number: number
}

/** The discs of a game on several discs, in order; empty for a game on one */
export async function getDiscs(scope: LibraryScope, rom: { discGroup: null | string; platform: PlatformName }) {
  if (!rom.discGroup) {
    return []
  }
  const discs = await scope.db
    .select({ fileId: romTable.fileId, fileName: romTable.fileName, id: romTable.id, number: romTable.discNumber })
    .from(romTable)
    .where(romsOf(scope, and(eq(romTable.platform, rom.platform), eq(romTable.discGroup, rom.discGroup))))
    .orderBy(asc(romTable.discNumber), asc(romTable.createdAt))
  // Two copies of the same disc number count once
  const seen = new Set<number>()
  return discs.filter((disc): disc is Disc => {
    if (disc.number === null || seen.has(disc.number)) {
      return false
    }
    seen.add(disc.number)
    return true
  })
}
