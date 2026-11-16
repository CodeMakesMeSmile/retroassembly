import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { PlatformName } from '#@/constants/platform.ts'
import { favoriteTable, romTable, statusEnum } from '#@/databases/schema.ts'
import { type LibraryScope, listedOnce } from '#@/utils/server/library-scope.ts'

export const romLetters = ['#', ...'abcdefghijklmnopqrstuvwxyz'] as const
export type RomLetter = (typeof romLetters)[number]

export interface RomLetterPage {
  /** Whether any game starts with it */
  has: boolean
  letter: RomLetter
  /** The page its first game is on */
  page: number
}

interface GetRomLettersParams {
  direction?: 'asc' | 'desc'
  favorite?: boolean
  /** Only these games: a search's matches */
  ids?: string[]
  pageSize?: number
  platform?: PlatformName
}

/**
 * For a list sorted by name, which page each letter's games start on, and which letters have games. "#" is the games
 * starting with anything other than a letter. Worked out in one query, counting the names before each letter
 */
export async function getRomLetters(
  scope: LibraryScope,
  { direction = 'asc', favorite = false, ids, pageSize = 100, platform }: GetRomLettersParams = {},
): Promise<RomLetterPage[]> {
  const conditions = [
    eq(romTable.userId, scope.libraryOwnerId),
    eq(romTable.status, statusEnum.normal),
    listedOnce(),
    platform ? eq(romTable.platform, platform) : inArray(romTable.platform, scope.preference.ui.platforms),
  ]
  if (favorite) {
    conditions.push(isNotNull(favoriteTable.id))
  }
  if (ids) {
    conditions.push(sql`${romTable.id} IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`)
  }
  // The same key the list sorts by
  const name = sql`LOWER(${romTable.fileName})`
  const letters = romLetters.slice(1)
  const columns: Record<string, ReturnType<typeof sql<number>>> = { total: sql<number>`count(*)` }
  for (const letter of letters) {
    const next = String.fromCodePoint((letter.codePointAt(0) ?? 0) + 1)
    columns[`before_${letter}`] = sql<number>`coalesce(sum(${name} < ${letter}), 0)`
    columns[`after_${letter}`] = sql<number>`coalesce(sum(${name} >= ${next}), 0)`
    columns[`in_${letter}`] = sql<number>`coalesce(sum(${name} >= ${letter} AND ${name} < ${next}), 0)`
  }
  const [counts] = await scope.db
    .select(columns)
    .from(romTable)
    .leftJoin(
      favoriteTable,
      and(
        eq(favoriteTable.romId, romTable.id),
        eq(favoriteTable.userId, scope.user.id),
        eq(favoriteTable.status, statusEnum.normal),
      ),
    )
    .where(and(...conditions))

  function pageOf(position: number) {
    return Math.floor(position / pageSize) + 1
  }
  const lettered = letters.reduce((sum, letter) => sum + counts[`in_${letter}`], 0)
  const symbols = counts.total - lettered
  return [
    // Games starting with a number or symbol come first by name, and last the other way round
    { has: symbols > 0, letter: '#', page: direction === 'asc' ? 1 : pageOf(lettered) },
    ...letters.map((letter) => ({
      has: counts[`in_${letter}`] > 0,
      letter,
      // Ascending, a letter's first game comes after every name before it; descending, after every name past it
      page: pageOf(counts[direction === 'asc' ? `before_${letter}` : `after_${letter}`]),
    })),
  ]
}
