import { and, countDistinct, eq, inArray } from 'drizzle-orm'
import { launchRecordTable, statusEnum } from '#@/databases/schema.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'
import { findSearchMatches } from './search-roms.ts'

/**
 * How many games match a search, in all and on each console, and how many of them are favorites or have been played,
 * for the counts beside each link in the sidebar. The same matches the lists show, from the same search
 */
export async function countSearchMatches(scope: LibraryScope, query: string) {
  const { matches } = await findSearchMatches(scope, { query })

  const platforms: Record<string, number> = {}
  let favorites = 0
  for (const { isFavorite, platform } of matches) {
    platforms[platform] = (platforms[platform] ?? 0) + 1
    if (isFavorite) {
      favorites += 1
    }
  }

  let history = 0
  if (matches.length > 0) {
    const [row] = await scope.db
      .select({ total: countDistinct(launchRecordTable.romId) })
      .from(launchRecordTable)
      .where(
        and(
          eq(launchRecordTable.userId, scope.user.id),
          eq(launchRecordTable.status, statusEnum.normal),
          inArray(
            launchRecordTable.romId,
            matches.map(({ id }) => id),
          ),
        ),
      )
    history = row?.total ?? 0
  }

  return { favorites, games: matches.length, history, platforms }
}
