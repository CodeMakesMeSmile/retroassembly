import type { ConsoleDefinition } from './types.ts'

// Bandai
export const bandaiConsoles = {
  wonderswan: {
    cores: ['mednafen_wswan'],
    displayNameI18nKey: 'platform.wonderswan',
    fileExtensions: ['.ws', '.zip'],
    info: {
      developer: 'Bandai Co., Ltd.',
      manufacturer: 'Bandai Co., Ltd.',
      notesI18nKey: 'platform.wonderswanNote',
      releaseDate: '1999-03-04T00:00:00-08:00',
    },
    libretroName: 'Bandai - WonderSwan',
    setups: [
      {
        controls: 'wonderswan',
        cores: ['mednafen_wswan'],
      },
    ],
  },
  wonderswancolor: {
    cores: ['mednafen_wswan'],
    displayNameI18nKey: 'platform.wonderswanColor',
    fileExtensions: ['.wsc', '.zip'],
    info: {
      developer: 'Bandai Co., Ltd.',
      manufacturer: 'Bandai Co., Ltd.',
      notesI18nKey: 'platform.wonderswanColorNote',
      releaseDate: '2000-12-09T00:00:00-08:00',
    },
    libretroName: 'Bandai - WonderSwan Color',
    setups: [
      {
        controls: 'wonderswan',
        cores: ['mednafen_wswan'],
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
