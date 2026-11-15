import { getContext } from 'hono/context-storage'
import { getRoms } from '#@/controllers/roms/get-roms.ts'
import { getLibraryScope } from '#@/utils/server/library-scope.ts'
import { getLibraryLoaderData } from '#@/utils/server/loader-data.ts'
import { getRomsQuery } from '#@/utils/server/misc.ts'
import FavoritesPage from '../library/favorites/page.tsx'

export async function loader() {
  const { t } = getContext().var
  const romsQuery = getRomsQuery()
  const { pagination, roms } = await getRoms(getLibraryScope(), { ...romsQuery, favorite: true })
  return await getLibraryLoaderData({ pagination, roms, title: t('nav.favorites') })
}

export default function LibraryFavoritesRoute() {
  return <FavoritesPage />
}
