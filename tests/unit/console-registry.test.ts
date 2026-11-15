import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { resolveConsole } from '#@/consoles/registry.ts'
import { coreDisplayNameMap } from '#@/constants/core.ts'
import { platformMap, platforms } from '#@/constants/platform.ts'
import { getCoreUrl, isBundledCore } from '#@/utils/isomorphic/emulator-files.ts'

// The fixtures record what the app decided for each console before the registry; the registry must decide the same
async function readFixture(name: string) {
  return JSON.parse(await readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8'))
}

const setups: Record<string, unknown> = await readFixture('console-setups.json')
const data = await readFixture('console-data.json')

await describe('console registry', async () => {
  for (const [pair, expected] of Object.entries(setups)) {
    await it(`sets up ${pair} as before`, () => {
      const [platform, core] = pair.split('/')
      const { coin, controls, hints, keyboard, launch } = resolveConsole(platform, core)
      assert.deepEqual({ coin, controls, hints, keyboard, launch }, expected)
    })
  }

  await it('keeps the console table, and its order, as before', () => {
    assert.deepEqual(structuredClone(platformMap), data.platformMap)
    assert.deepEqual(
      platforms.map(({ name }) => name),
      data.platformOrder,
    )
  })

  await it("keeps each emulator's name and download address as before", () => {
    const emulators = Object.fromEntries(
      Object.keys(coreDisplayNameMap).map((core) => [
        core,
        { bundled: isBundledCore(core), displayName: coreDisplayNameMap[core], url: getCoreUrl(core) },
      ]),
    )
    assert.deepEqual(emulators, data.emulators)
  })
})
