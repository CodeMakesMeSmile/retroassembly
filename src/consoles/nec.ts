import type { ConsoleDefinition } from './types.ts'

// NEC
export const necConsoles = {
  pcengine: {
    bioses: [
      {
        md5: '38179df8f4ac870017db21ebcbf53114',
        name: 'syscard3.pce',
      },
      {
        name: 'syscard2.pce',
      },
      {
        name: 'syscard1.pce',
      },
      {
        name: 'gexpress.pce',
      },
    ],
    cores: ['mednafen_pce_fast'],
    displayNameI18nKey: 'platform.pcengine',
    fileExtensions: ['.pce', '.bin', '.zip'],
    info: {
      developer: 'NEC Corporation, Hudson Soft',
      manufacturer: 'NEC Corporation, Hudson Soft',
      notesI18nKey: 'platform.pcengineNote',
      releaseDate: '1989-08-29T00:00:00-07:00',
    },
    libretroName: 'NEC - PC Engine - TurboGrafx 16',
    setups: [
      {
        controls: 'pcengine',
        cores: ['mednafen_pce_fast'],
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
