import { launchRecordTable } from '#@/databases/schema.ts'
import { findRom, type LibraryScope } from '#@/utils/server/library-scope.ts'

interface CreateRomParams {
  core: string
  rom: string
}

export async function createLaunchRecord(scope: LibraryScope, params: CreateRomParams) {
  const { user: currentUser } = scope
  const library = scope.db

  const rom = await findRom(scope, params.rom)

  const [result] = await library
    .insert(launchRecordTable)
    .values({
      core: params.core,
      platform: rom.platform,
      romId: rom.id,
      userId: currentUser.id,
    })
    .returning()

  return result
}
