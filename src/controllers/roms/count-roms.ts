import { count, eq } from 'drizzle-orm'
import type { PlatformName } from '#@/constants/platform.ts'
import { romTable } from '#@/databases/schema.ts'
import { type LibraryScope, romsOf } from '#@/utils/server/library-scope.ts'

export async function countRoms(scope: LibraryScope, { platform }: { platform?: PlatformName } = {}) {
  const [result] = await scope.db
    .select({ count: count() })
    .from(romTable)
    .where(romsOf(scope, platform ? eq(romTable.platform, platform) : undefined))
  return result.count
}
