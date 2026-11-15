import assert from 'node:assert'
import { getContext } from 'hono/context-storage'
import { generatePath, redirect } from 'react-router'
import type { PlatformName } from '#@/constants/platform.ts'
import { getLatestGameSave } from '#@/controllers/game-saves/game-saves.ts'
import { getDiscs } from '#@/controllers/roms/get-discs.ts'
import { getRom } from '#@/controllers/roms/get-rom.ts'
import { getStates } from '#@/controllers/states/get-states.ts'
import { routes } from '#@/pages/routes.ts'
import { getRomGoodcodes } from '#@/utils/client/library.ts'
import { getLibraryScope } from '#@/utils/server/library-scope.ts'
import RomPage from '../library/platform/rom/page.tsx'
import type { Route } from './+types/library-platform-rom.ts'

export async function loader({ params }: Route.LoaderArgs) {
  assert.ok(params.fileName)
  assert.ok(params.platform)
  const platform = params.platform as PlatformName
  const rom = await getRom(getLibraryScope(), { fileName: params.fileName, platform })
  if (!rom) {
    throw new Response('Not Found', { status: 404 })
  }
  // A game on several discs has one page, its first disc's; another disc's address leads there
  const discs = await getDiscs(getLibraryScope(), rom)
  if (discs.length > 0 && discs[0].id !== rom.id) {
    throw redirect(generatePath(routes.libraryPlatformRom, { fileName: discs[0].fileName, platform }))
  }
  const { preference } = getContext().var
  const core = preference.emulator.platform[rom.platform]?.core
  const [[state], gameSave] = await Promise.all([
    getStates(getLibraryScope(), { core, limit: 1, rom: rom?.id, type: 'any' }),
    // The game's own save, put back before it boots
    core ? getLatestGameSave(getLibraryScope(), { core, rom: rom.id }) : undefined,
  ])
  return { discs, gameSave, rom, state, title: getRomGoodcodes(rom).rom }
}

export default function LibraryPlatformRomRoute() {
  return <RomPage />
}
