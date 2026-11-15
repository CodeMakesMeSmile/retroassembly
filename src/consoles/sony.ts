import type { ConsoleDefinition } from './types.ts'

// Sony
export const sonyConsoles = {
  psx: {
    multiDisc: true,
    bioses: [
      {
        md5: '6e3735ff4c7dc899ee98981385f6f3d0',
        name: 'scph101.bin',
      },
      {
        md5: '1e68c231d0896b7eadcad1d7d8e76129',
        name: 'scph7001.bin',
      },
      {
        md5: '924e392ed05558ffdb115408c263dccf',
        name: 'scph1001.bin',
      },
      {
        md5: '490f666e1afb15b7362b406ed1cea246',
        name: 'scph5501.bin',
      },
    ],
    cores: ['pcsx_rearmed'],
    displayNameI18nKey: 'platform.psx',
    fileExtensions: ['.chd'],
    info: {
      developer: 'Sony Computer Entertainment',
      manufacturer: 'Sony Computer Entertainment',
      notesI18nKey: 'platform.psxNote',
      releaseDate: '1994-12-03T00:00:00-08:00',
    },
    libretroName: 'Sony - PlayStation',
    // PCSX ReARMed is told it has a DualShock, whose sticks the on-screen gamepad tilts
    setups: [
      {
        controls: 'psx',
        cores: ['pcsx_rearmed'],
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
