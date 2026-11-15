import { arcadeConsoles } from './arcade.ts'
import { atariConsoles } from './atari.ts'
import { bandaiConsoles } from './bandai.ts'
import { type CoreName, emulators } from './emulators.ts'
import { necConsoles } from './nec.ts'
import { nintendoConsoles } from './nintendo.ts'
import { otherConsoles } from './other.ts'
import { segaConsoles } from './sega.ts'
import { snkConsoles } from './snk.ts'
import { sonyConsoles } from './sony.ts'
import type {
  ConsoleDefinition,
  ControllerButton,
  ControlsKind,
  EmulatorDefinition,
  HintsKind,
  KeyboardKind,
  LaunchProfile,
} from './types.ts'

// Every console the app plays, one file per controller family. RetroPie's platform list was a starting point for the
// names and file types, though they're not identical: https://github.com/RetroPie/RetroPie-Setup/blob/master/platforms.cfg
export const consoles = {
  ...arcadeConsoles,
  ...atariConsoles,
  ...bandaiConsoles,
  ...necConsoles,
  ...nintendoConsoles,
  ...otherConsoles,
  ...segaConsoles,
  ...snkConsoles,
  ...sonyConsoles,
} satisfies Record<string, ConsoleDefinition>

export type ConsoleName = keyof typeof consoles

export interface ResolvedConsole {
  /** Select inserts a coin */
  coin: boolean
  console: ConsoleDefinition
  /** The buttons of the console's own controller, as its emulator reads them; empty if they're the RetroPad's */
  controller: ControllerButton[]
  controls: ControlsKind
  emulator: (typeof emulators)[CoreName]
  hints: HintsKind
  keyboard: KeyboardKind
  launch: {
    attachVirtualGamepad: boolean
    audioLatency: null | number
    canvasThumbnail: boolean
    dualShockRemap: boolean
    nudgeAfterStart: boolean
    rewindBufferSize: number
    runAhead: boolean
    stickAxes: 'both' | 'left' | null
  }
}

/** Everything about playing a game on `platform` with the emulator `core` */
export function resolveConsole(platform: string, core: string): ResolvedConsole {
  const definition: ConsoleDefinition = consoles[platform as ConsoleName]
  const emulator = emulators[core as CoreName]
  const setup = definition?.setups?.find(({ cores }) => !cores || cores.includes(core as CoreName))
  const launch: LaunchProfile = (emulator as EmulatorDefinition | undefined)?.launch ?? {}
  return {
    coin: Boolean(definition?.coin),
    console: definition,
    controller: setup?.controller ?? [],
    controls: setup?.controls ?? 'generic',
    emulator,
    hints: setup?.hints ?? 'generic',
    keyboard: setup?.keyboard ?? 'standard',
    launch: {
      attachVirtualGamepad: Boolean(launch.attachVirtualGamepad || definition?.attachVirtualGamepad),
      audioLatency: launch.audioLatency ?? null,
      canvasThumbnail: Boolean(launch.canvasThumbnail),
      dualShockRemap: Boolean(launch.dualShockRemap),
      nudgeAfterStart: Boolean(launch.nudgeAfterStart),
      rewindBufferSize: launch.heavy ? 100 : 20,
      runAhead: !launch.heavy,
      stickAxes: launch.stickAxes ?? null,
    },
  }
}
