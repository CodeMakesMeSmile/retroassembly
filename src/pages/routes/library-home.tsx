import { getContext } from 'hono/context-storage'
import { getLaunchRecords } from '#@/controllers/launch-records/get-launch-records.ts'
import { type Disc, getDiscs } from '#@/controllers/roms/get-discs.ts'
import { getRom } from '#@/controllers/roms/get-rom.ts'
import { getRomsWithStates } from '#@/controllers/roms/get-roms-with-states.ts'
import { getRoms } from '#@/controllers/roms/get-roms.ts'
import { getStates } from '#@/controllers/states/get-states.ts'
import { getLibraryScope } from '#@/utils/server/library-scope.ts'
import { LibraryHomePage } from '../library/home/page.tsx'

export async function loader() {
  const { preference } = getContext().var

  const [{ roms: recentlySavedRoms }, { roms: newAddedRoms }, { roms: favoriteRoms }, { roms: recentlyLaunchedRoms }] =
    await Promise.all([
      getRomsWithStates(getLibraryScope(), { pageSize: 1 }),
      getRoms(getLibraryScope(), { direction: 'desc', orderBy: 'added', pageSize: 20 }),
      getRoms(getLibraryScope(), { favorite: true, pageSize: 20 }),
      getLaunchRecords(getLibraryScope(), { pageSize: 1 }),
    ])

  const data: {
    discs: Disc[]
    rom: (typeof recentlySavedRoms)[number] | null
    state: any
  } = { discs: [], rom: null, state: null }

  const rom = recentlySavedRoms[0] || recentlyLaunchedRoms[0] || newAddedRoms[0]
  if (rom) {
    const [state] = await getStates(getLibraryScope(), {
      core: preference.emulator.platform[rom.platform].core,
      limit: 1,
      rom: rom?.id,
      type: 'any',
    })
    data.rom = rom
    if (state) {
      data.state = state
    }
    // A game on several discs is played with all of them
    const fullRom = await getRom(getLibraryScope(), { id: rom.id })
    if (fullRom) {
      data.discs = await getDiscs(getLibraryScope(), fullRom)
    }
  }

  return {
    discs: data.discs,
    favoriteRoms,
    newAddedRoms,
    recentlySavedRoms,
    rom: data.rom,
    state: data.state,
    title: '',
  }
}

export default function LibraryRoute() {
  return <LibraryHomePage />
}
