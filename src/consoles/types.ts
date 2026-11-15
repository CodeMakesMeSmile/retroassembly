import type { CoreName } from './emulators.ts'

/** Which on-screen controls a game gets on a touch screen; `generic` is the RetroPad layout with the console's labels */
export type ControlsKind =
  | 'arcade'
  | 'atari2600'
  | 'atari5200'
  | 'atari7800'
  | 'channelf'
  | 'colecovision'
  | 'ds'
  | 'fds'
  | 'gamegear'
  | 'gb'
  | 'gba'
  | 'generic'
  | 'genesis'
  | 'gw'
  | 'lynx'
  | 'mastersystem'
  | 'n64'
  | 'nes'
  | 'ngp'
  | 'odyssey2'
  | 'pcengine'
  | 'psx'
  | 'snes'
  | 'vb'
  | 'wonderswan'

/** The keys a game needs beyond the shared keyboard mapping */
export type KeyboardKind = 'arcade' | 'colecovision' | 'ds' | 'genesis' | 'n64' | 'odyssey2' | 'standard'

/** How the pause menu describes the keyboard */
export type HintsKind = 'arcade' | 'colecovision' | 'generic' | 'genesis' | 'n64'

export interface Bios {
  md5?: string
  name: string
  required?: boolean
}

/** How a console is played with some of its emulators; `cores` left out means with any of them */
export interface Setup {
  controls: ControlsKind
  cores?: CoreName[]
  hints?: HintsKind
  keyboard?: KeyboardKind
}

export interface ConsoleDefinition {
  /** The on-screen gamepad's sticks or extra buttons drive the game whichever emulator plays it */
  attachVirtualGamepad?: boolean
  bioses?: Bios[]
  /** Select inserts a coin */
  coin?: boolean
  /** The emulators that play it, the default first */
  cores: CoreName[]
  displayNameI18nKey: string
  fileExtensions: string[]
  info: {
    developer?: string
    manufacturer?: string
    notesI18nKey: string
    releaseDate: string
  }
  libretroName: string
  setups?: Setup[]
}

/** How an emulator is started and run */
export interface LaunchProfile {
  /** The on-screen gamepad's sticks or extra buttons drive the game, so the gamepad is attached to the emulator */
  attachVirtualGamepad?: boolean
  /** A larger audio buffer, in milliseconds, for an emulator whose frames can take too long */
  audioLatency?: number
  /** Told by a remap file that its controller is a DualShock */
  dualShockRemap?: boolean
  /** Too slow for run-ahead, and given a larger rewind buffer */
  heavy?: boolean
  /** Paused and resumed once after starting, which it needs to run */
  nudgeAfterStart?: boolean
  /** Which of the on-screen gamepad's sticks are analog axes, on a touch screen */
  stickAxes?: 'both' | 'left'
}

export interface EmulatorDefinition {
  displayName: string
  launch?: LaunchProfile
  /** Shipped with the app, built for this fork, or from the RetroArch Emscripten build */
  source: 'bundled' | 'custom' | 'retroarch'
}
