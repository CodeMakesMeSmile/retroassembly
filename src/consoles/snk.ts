import type { ConsoleDefinition } from './types.ts'

// SNK
export const snkConsoles = {
  ngp: {
    cores: ['mednafen_ngp'],
    displayNameI18nKey: 'platform.neoGeoPocket',
    fileExtensions: ['.ngp', '.zip'],
    info: {
      developer: 'SNK',
      manufacturer: 'SNK',
      notesI18nKey: 'platform.neoGeoPocketNote',
      releaseDate: '1998-12-31T00:00:00-08:00',
    },
    libretroName: 'SNK - Neo Geo Pocket',
    setups: [
      {
        controls: 'ngp',
        cores: ['mednafen_ngp'],
      },
    ],
  },
  ngpc: {
    cores: ['mednafen_ngp'],
    displayNameI18nKey: 'platform.neoGeoPocketColor',
    fileExtensions: ['.ngc', '.zip'],
    info: {
      developer: 'SNK',
      manufacturer: 'SNK',
      notesI18nKey: 'platform.neoGeoPocketColorNote',
      releaseDate: '1999-03-16T00:00:00-08:00',
    },
    libretroName: 'SNK - Neo Geo Pocket Color',
    setups: [
      {
        controls: 'ngp',
        cores: ['mednafen_ngp'],
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
