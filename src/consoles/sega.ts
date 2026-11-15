import type { ConsoleDefinition } from './types.ts'

// Sega
export const segaConsoles = {
  gamegear: {
    bioses: [
      {
        md5: '672e104c3be3a238301aceffc3b23fd6',
        name: 'bios.gg',
      },
    ],
    cores: ['genesis_plus_gx', 'gearsystem'],
    displayNameI18nKey: 'platform.gameGear',
    fileExtensions: ['.gg', '.zip'],
    info: {
      developer: 'Nintendo',
      manufacturer: 'Nintendo',
      notesI18nKey: 'platform.gameGearNote',
      releaseDate: '1990-10-06T00:00:00-07:00',
    },
    libretroName: 'Sega - Game Gear',
    // Both Game Gear emulators read buttons 1 and 2 the same way
    setups: [
      {
        controls: 'gamegear',
      },
    ],
  },
  genesis: {
    bioses: [
      {
        md5: '45e298905a08f9cfb38fd504cd6dbc84',
        name: 'bios_MD.bin',
      },
      {
        name: 'ggenie.bin',
      },
    ],
    cores: ['genesis_plus_gx', 'picodrive'],
    displayNameI18nKey: 'platform.genesis',
    fileExtensions: ['.md', '.gen', '.zip'],
    info: {
      developer: 'Sega Enterprises',
      manufacturer: 'Sega Enterprises',
      notesI18nKey: 'platform.megadriveNote',
      releaseDate: '1989-08-14T00:00:00-07:00',
    },
    libretroName: 'Sega - Mega Drive - Genesis',
    // Drawn like its controller with the emulator whose buttons are known; Genesis games on PicoDrive keep the generic
    // layout
    setups: [
      {
        controller: [
          { key: 'z', label: 'A', retropad: 'y' },
          { key: 'x', label: 'B', retropad: 'b' },
          { key: 'c', label: 'C', retropad: 'a' },
          { key: 'a', label: 'X', retropad: 'l' },
          { key: 's', label: 'Y', retropad: 'x' },
          { key: 'd', label: 'Z', retropad: 'r' },
          { label: 'Start', retropad: 'start' },
          { label: 'Mode', retropad: 'select' },
        ],
        controls: 'genesis',
        cores: ['genesis_plus_gx'],
        hints: 'genesis',
        keyboard: 'genesis',
      },
    ],
  },
  megadrive: {
    bioses: [
      {
        md5: '45e298905a08f9cfb38fd504cd6dbc84',
        name: 'bios_MD.bin',
      },
      {
        name: 'ggenie.bin',
      },
    ],
    cores: ['genesis_plus_gx', 'picodrive'],
    displayNameI18nKey: 'platform.megadrive',
    fileExtensions: ['.md', '.gen', '.zip'],
    info: {
      developer: 'Sega Enterprises',
      manufacturer: 'Sega Enterprises',
      notesI18nKey: 'platform.megadriveNote',
      releaseDate: '1989-08-14T00:00:00-07:00',
    },
    libretroName: 'Sega - Mega Drive - Genesis',
    // Drawn like its controller with the emulator whose buttons are known; Mega Drive games on PicoDrive keep the generic
    // layout
    setups: [
      {
        controller: [
          { key: 'z', label: 'A', retropad: 'y' },
          { key: 'x', label: 'B', retropad: 'b' },
          { key: 'c', label: 'C', retropad: 'a' },
          { key: 'a', label: 'X', retropad: 'l' },
          { key: 's', label: 'Y', retropad: 'x' },
          { key: 'd', label: 'Z', retropad: 'r' },
          { label: 'Start', retropad: 'start' },
          { label: 'Mode', retropad: 'select' },
        ],
        controls: 'genesis',
        cores: ['genesis_plus_gx'],
        hints: 'genesis',
        keyboard: 'genesis',
      },
    ],
  },
  sega32x: {
    cores: ['picodrive'],
    displayNameI18nKey: 'platform.sega32x',
    fileExtensions: ['.32x', '.zip'],
    info: {
      developer: 'Nintendo',
      manufacturer: 'Nintendo',
      notesI18nKey: 'platform.sega32xNote',
      releaseDate: '1994-06-01T00:00:00-07:00',
    },
    libretroName: 'Sega - 32X',
    // The 32X plays with the Genesis's controller, and PicoDrive, its only emulator, reads it from the same buttons
    setups: [
      {
        controls: 'genesis',
        cores: ['picodrive'],
      },
    ],
  },
  'sg-1000': {
    cores: ['gearsystem'],
    displayNameI18nKey: 'platform.segaSg1000',
    fileExtensions: ['.sg', '.zip'],
    info: {
      developer: 'Sega',
      manufacturer: 'Sega',
      notesI18nKey: 'platform.segaSg1000Note',
      releaseDate: '1983-07-15T00:00:00-07:00',
    },
    libretroName: 'Sega - SG-1000',
    // The SG-1000's controller is the Master System's, and shares its controls
    setups: [
      {
        controls: 'mastersystem',
      },
    ],
  },
  sms: {
    bioses: [
      {
        md5: '840481177270d5642a14ca71ee72844c',
        name: 'bios_E.sms',
      },
      {
        md5: '840481177270d5642a14ca71ee72844c',
        name: 'bios_U.sms',
      },
      {
        md5: '24a519c53f67b00640d0048ef7089105',
        name: 'bios_J.sms',
      },
    ],
    cores: ['genesis_plus_gx', 'picodrive', 'gearsystem'],
    displayNameI18nKey: 'platform.masterSystem',
    fileExtensions: ['.sms', '.zip'],
    info: {
      developer: 'SEGA Enterprises Ltd.',
      manufacturer: 'SEGA Enterprises Ltd.',
      notesI18nKey: 'platform.masterSystemNote',
      releaseDate: '1986-09-01T00:00:00-07:00',
    },
    libretroName: 'Sega - Master System - Mark III',
    // All three Master System emulators read buttons 1 and 2, and Pause, the same way
    setups: [
      {
        controls: 'mastersystem',
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
