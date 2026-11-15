import { findRom, type LibraryScope } from '#@/utils/server/library-scope.ts'
import { deleteRoms } from './delete-roms.ts'

export async function deleteRom(scope: LibraryScope, id: string) {
  await findRom(scope, id)
  await deleteRoms(scope, [id])
}
