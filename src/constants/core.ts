import { mapValues } from 'es-toolkit'
import { type CoreName, emulators } from '../consoles/emulators.ts'

// The emulator table as the rest of the app has always read it. The emulators themselves are defined in src/consoles

export { coreOptionsMap } from './core-options/index.ts'

export type { CoreName }

export const cores = mapValues(emulators, ({ displayName }) => ({ displayName }))

export const coreDisplayNameMap: Record<string, string> = mapValues(emulators, ({ displayName }) => displayName)
