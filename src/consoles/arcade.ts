import type { ConsoleDefinition } from './types.ts'

// Arcade machines
export const arcadeConsoles = {
  arcade: {
    bioses: [
      {
        name: 'bubsys.zip',
      },
      {
        name: 'cchip.zip',
      },
      {
        name: 'channelf.zip',
      },
      {
        name: 'coleco.zip',
      },
      {
        name: 'decocass.zip',
      },
      {
        name: 'fdsbios.zip',
      },
      {
        name: 'hiscore.dat',
      },
      {
        name: 'isgsm.zip',
      },
      {
        name: 'midssio.zip',
      },
      {
        name: 'msx.zip',
      },
      {
        name: 'namcoc69.zip',
      },
      {
        name: 'namcoc70.zip',
      },
      {
        name: 'namcoc75.zip',
      },
      {
        name: 'neocdz.zip',
      },
      {
        name: 'neogeo.zip',
      },
      {
        name: 'ngp.zip',
      },
      {
        name: 'nmk004.zip',
      },
      {
        name: 'pgm.zip',
      },
      {
        name: 'skns.zip',
      },
      {
        name: 'spec128.zip',
      },
      {
        name: 'spec1282a.zip',
      },
      {
        name: 'spectrum.zip',
      },
      {
        name: 'ym2608.zip',
      },
    ],
    coin: true,
    cores: ['fbneo', 'mame2003_plus'],
    displayNameI18nKey: 'platform.arcade',
    fileExtensions: ['.zip'],
    info: {
      notesI18nKey: 'platform.arcadeNote',
      releaseDate: '1971-10-15T00:00:00-07:00',
    },
    libretroName: 'MAME',
    // Drawn like a cabinet with FinalBurn Neo, whose button numbers are known; MAME 2003-Plus keeps the generic layout
    setups: [
      {
        controller: [
          { color: '#ff5a5a', key: 'z', label: '1', retropad: 'b' },
          { color: '#f1c40f', key: 'x', label: '2', retropad: 'a' },
          { color: '#5aa8ff', key: 'a', label: '3', retropad: 'y' },
          { color: '#4fcf68', key: 's', label: '4', retropad: 'x' },
          { color: '#e6e6ea', key: 'c', label: '5', retropad: 'r' },
          { key: 'd', label: '6', retropad: 'l' },
          { label: 'Start', retropad: 'start' },
        ],
        controls: 'arcade',
        cores: ['fbneo'],
        hints: 'arcade',
        keyboard: 'arcade',
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
