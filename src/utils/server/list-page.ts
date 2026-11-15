import { getContext } from 'hono/context-storage'
import { platformMap, type PlatformName } from '#@/constants/platform.ts'
import { getLaunchRecords } from '#@/controllers/launch-records/get-launch-records.ts'
import { getRomPlatformCount } from '#@/controllers/roms/get-rom-platform-count.ts'
import { getRoms } from '#@/controllers/roms/get-roms.ts'
import { getLibraryScope } from './library-scope.ts'
import { getRomsQuery } from './misc.ts'

// The pages listing games: Games, Favorites, History, and a console's games. The sort, order and page come from the
// address

export async function loadGamesPage() {
  const scope = getLibraryScope()
  const [{ pagination, roms }, platformCount] = await Promise.all([
    getRoms(scope, getRomsQuery()),
    getRomPlatformCount(scope),
  ])
  return { pagination, platformCount, roms, title: getContext().var.t('common.games') }
}

export async function loadFavoritesPage() {
  const { pagination, roms } = await getRoms(getLibraryScope(), { ...getRomsQuery(), favorite: true })
  return { pagination, roms, title: getContext().var.t('nav.favorites') }
}

export async function loadHistoryPage() {
  const { page } = getRomsQuery()
  const { pagination, roms } = await getLaunchRecords(getLibraryScope(), { page })
  return { page, pagination, roms, title: getContext().var.t('nav.history') }
}

/** A console's games; a console the app doesn't know is not found */
export async function loadPlatformPage(name: string | undefined) {
  if (!name || !(name in platformMap)) {
    throw new Response('Not Found', { status: 404 })
  }
  const platform = name as PlatformName
  const query = getRomsQuery()
  const { pagination, roms } = await getRoms(getLibraryScope(), { ...query, platform })
  return {
    favorite: query.favorite,
    pagination,
    platform,
    roms,
    title: getContext().var.t(platformMap[platform].displayNameI18nKey),
  }
}
