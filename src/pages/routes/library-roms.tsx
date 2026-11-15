import { getContext } from 'hono/context-storage'
import { getRomPlatformCount } from '#@/controllers/roms/get-rom-platform-count.ts'
import { getRoms } from '#@/controllers/roms/get-roms.ts'
import { getLibraryScope } from '#@/utils/server/library-scope.ts'
import { getLibraryLoaderData } from '#@/utils/server/loader-data.ts'
import { getRomsQuery } from '#@/utils/server/misc.ts'
import LibraryROMsPage from '../library/roms/page.tsx'

export async function loader() {
  const { t } = getContext().var
  const romsQuery = getRomsQuery()
  const [{ pagination, roms }, platformCount] = await Promise.all([
    getRoms(getLibraryScope(), romsQuery),
    getRomPlatformCount(getLibraryScope()),
  ])
  return await getLibraryLoaderData({ pagination, platformCount, roms, title: t('common.games') })
}

export default function LibraryRoute() {
  return <LibraryROMsPage />
}
