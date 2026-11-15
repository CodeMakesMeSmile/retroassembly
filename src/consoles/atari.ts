import type { ConsoleDefinition } from './types.ts'

// Atari
export const atariConsoles = {
  atari2600: {
    cores: ['stella2014'],
    displayNameI18nKey: 'platform.atari2600',
    fileExtensions: ['.a26', '.zip'],
    info: {
      developer: 'Atari, Inc.',
      manufacturer: 'Atari, Inc.',
      notesI18nKey: 'platform.atari2600Note',
      releaseDate: '1977-09-11T00:00:00-07:00',
    },
    libretroName: 'Atari - 2600',
    setups: [
      {
        controls: 'atari2600',
        cores: ['stella2014'],
      },
    ],
  },
  atari5200: {
    bioses: [
      {
        md5: '281f20ea4320404ec820fb7ec0693b38',
        name: '5200.rom',
      },
    ],
    cores: ['a5200'],
    displayNameI18nKey: 'platform.atari5200',
    fileExtensions: ['.a52', '.xfd', '.atr', '.atx', '.cdm', '.cas', '.xex', '.zip'],
    info: {
      developer: 'Atari, Inc.',
      manufacturer: 'Atari, Inc.',
      notesI18nKey: 'platform.atari5200Note',
      releaseDate: '1982-11-01T00:00:00-08:00',
    },
    libretroName: 'Atari - 5200',
    setups: [
      {
        controls: 'atari5200',
        cores: ['a5200'],
      },
    ],
  },
  atari7800: {
    bioses: [
      {
        md5: '0763f1ffb006ddbe32e52d497ee848ae',
        name: '7800 BIOS (U).rom',
      },
      {
        md5: '397bb566584be7b9764e7a68974c4263',
        name: '7800 BIOS (E).rom',
      },
    ],
    cores: ['prosystem'],
    displayNameI18nKey: 'platform.atari7800',
    fileExtensions: ['.a78', '.zip'],
    info: {
      developer: 'Atari Corporation',
      manufacturer: 'Atari Corporation',
      notesI18nKey: 'platform.atari7800Note',
      releaseDate: '1986-05-01T00:00:00-07:00',
    },
    libretroName: 'Atari - 7800',
    setups: [
      {
        controls: 'atari7800',
        cores: ['prosystem'],
      },
    ],
  },
  atarilynx: {
    bioses: [
      {
        md5: 'fcd403db69f54290b51035d82f835e7b',
        name: 'lynxboot.img',
        required: true,
      },
    ],
    cores: ['mednafen_lynx'],
    displayNameI18nKey: 'platform.atariLynx',
    fileExtensions: ['.lnx', '.lyx', '.bll', '.o', '.zip'],
    info: {
      developer: 'Atari Corporation, Epyx, Inc.',
      manufacturer: 'Atari Corporation',
      notesI18nKey: 'platform.atariLynxNote',
      releaseDate: '1989-09-01T00:00:00-07:00',
    },
    libretroName: 'Atari - Lynx',
    setups: [
      {
        controls: 'lynx',
        cores: ['mednafen_lynx'],
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
