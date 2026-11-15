import { mapValues, omit, sortBy } from 'es-toolkit'
import { type ConsoleName, consoles } from '../consoles/registry.ts'
import type { ConsoleDefinition } from '../consoles/types.ts'

// The console table as the rest of the app has always read it. The consoles themselves are defined in src/consoles

export type PlatformName = ConsoleName

export interface Platform extends Omit<ConsoleDefinition, 'attachVirtualGamepad' | 'coin' | 'multiDisc' | 'setups'> {
  name: PlatformName
}

export const platformMap: Record<PlatformName, Platform> = mapValues(
  consoles as Record<PlatformName, ConsoleDefinition>,
  (definition, name) => ({ name, ...omit(definition, ['attachVirtualGamepad', 'coin', 'multiDisc', 'setups']) }),
)

export const platforms = sortBy(Object.values(platformMap), ['displayNameI18nKey'])
