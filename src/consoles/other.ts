import type { ConsoleDefinition } from './types.ts'

// Fairchild, Coleco, Magnavox and Philips
export const otherConsoles = {
  channelf: {
    bioses: [
      {
        md5: 'da98f4bb3242ab80d76629021bb27585',
        name: 'sl31254.bin',
        required: true,
      },
      {
        md5: '95d339631d867c8f1d15a5f2ec26069d',
        name: 'sl90025.bin',
        required: true,
      },
      {
        md5: 'ac9804d4c0e9d07e33472e3726ed15c3',
        name: 'sl31253.bin',
        required: true,
      },
    ],
    cores: ['freechaf'],
    displayNameI18nKey: 'platform.channelF',
    fileExtensions: ['.bin', '.rom', '.zip'],
    info: {
      developer: 'Fairchild Semiconductor',
      manufacturer: 'Fairchild Semiconductor',
      notesI18nKey: 'platform.channelFNote',
      releaseDate: '1976-11-01T00:00:00-08:00',
    },
    libretroName: 'Fairchild - Channel F',
    // FreeChaF reads the Channel F's stick, its push, pull and twists, Console and Swap; the joystick goes through the
    // on-screen gamepad
    setups: [
      {
        controls: 'channelf',
        cores: ['freechaf'],
      },
    ],
  },
  colecovision: {
    bioses: [
      {
        md5: '2c66f5911e5b42b8ebe113403548eee7',
        name: 'colecovision.rom',
        required: true,
      },
    ],
    cores: ['gearcoleco'],
    displayNameI18nKey: 'platform.colecovision',
    fileExtensions: ['.col', '.cv', '.bin', '.rom', '.zip'],
    info: {
      developer: 'Coleco Industries, Inc.',
      manufacturer: 'Coleco Industries, Inc.',
      notesI18nKey: 'platform.colecovisionNote',
      releaseDate: '1982-08-01T00:00:00-07:00',
    },
    libretroName: 'Coleco - ColecoVision',
    // The keypad opens from beside pause
    setups: [
      {
        controller: [
          { color: '#f5944a', label: 'Fire L', retropad: 'b' },
          { color: '#f5944a', label: 'Fire R', retropad: 'a' },
          { label: '✱', retropad: 'start' },
          { label: '#', retropad: 'select' },
        ],
        controls: 'colecovision',
        hints: 'colecovision',
        keyboard: 'colecovision',
      },
    ],
  },
  odyssey2: {
    bioses: [
      {
        name: 'o2rom.bin',
        required: true,
      },
    ],
    cores: ['o2em'],
    displayNameI18nKey: 'platform.magnavoxOdyssey2',
    fileExtensions: ['.bin', '.zip'],
    info: {
      developer: 'Magnavox / Philips',
      manufacturer: 'Magnavox / Philips',
      notesI18nKey: 'platform.magnavoxOdyssey2Note',
      releaseDate: '1978-12-01T00:00:00-08:00',
    },
    libretroName: 'Magnavox - Odyssey2',
    // O2EM reads the Odyssey²'s joystick, its action button and its keyboard, which the Videopac shares
    setups: [
      {
        controls: 'odyssey2',
        cores: ['o2em'],
        keyboard: 'odyssey2',
      },
    ],
  },
  videopac: {
    bioses: [
      {
        name: 'o2rom.bin',
        required: true,
      },
    ],
    cores: ['o2em'],
    displayNameI18nKey: 'platform.philipsVideopac',
    fileExtensions: ['.bin', '.zip'],
    info: {
      developer: 'Philips',
      manufacturer: 'Philips',
      notesI18nKey: 'platform.philipsVideopacNote',
      releaseDate: '1983-08-01T00:00:00-07:00',
    },
    libretroName: 'Philips - Videopac+',
    // O2EM reads the Videopac's joystick, its action button and its keyboard, as the Odyssey²'s
    setups: [
      {
        controls: 'odyssey2',
        cores: ['o2em'],
        keyboard: 'odyssey2',
      },
    ],
  },
} as const satisfies Record<string, ConsoleDefinition>
