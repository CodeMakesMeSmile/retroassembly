import { desc, eq } from 'drizzle-orm'
import { stateTable } from '#@/databases/schema.ts'
import { findRom, type LibraryScope, ownedBy } from '#@/utils/server/library-scope.ts'

export type States = Awaited<ReturnType<typeof getStates>>
export type State = States[number]

/** The user's own saves for a game in their library */
export async function getStates(
  scope: LibraryScope,
  {
    core,
    limit,
    rom,
    type = 'manual',
  }: {
    core?: string
    limit?: number
    rom: string
    // 'any' includes both, for picking the newest state to continue from
    type?: 'any' | 'auto' | 'manual'
  },
) {
  await findRom(scope, rom)
  const query = scope.db
    .select()
    .from(stateTable)
    .where(
      ownedBy(
        scope,
        stateTable,
        eq(stateTable.romId, rom),
        type === 'auto' || type === 'manual' ? eq(stateTable.type, type) : undefined,
        core ? eq(stateTable.core, core) : undefined,
      ),
    )
    .orderBy(desc(stateTable.createdAt))
  if (limit) {
    query.limit(limit)
  }
  return await query
}
