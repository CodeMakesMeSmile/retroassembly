// The RetroPad is libretro's model controller: every emulator reads its game's controller from these buttons and axes

export const retroPadButtons = [
  'a',
  'b',
  'x',
  'y',
  'l',
  'r',
  'l2',
  'r2',
  'l3',
  'r3',
  'select',
  'start',
  'up',
  'down',
  'left',
  'right',
] as const

export type RetroPadButton = (typeof retroPadButtons)[number]

// A stick pushed one way: l_x_minus is the left stick pushed left
export type RetroPadAxis = `${'l' | 'r'}_${'x' | 'y'}_${'minus' | 'plus'}`

export type RetroPadInput = RetroPadAxis | RetroPadButton

/** RetroArch's setting for the key that plays an input, such as input_player1_a */
export function keySetting(input: RetroPadInput) {
  return `input_player1_${input}` as const
}

// The app's keyboard and gamepad settings call the shoulder buttons L1 and R1; RetroArch calls them l and r. RetroArch
// ignores names it doesn't know, so without the rename a remapped L or R would have no effect
const retroarchNames: Record<string, string> = {
  input_player1_l1: 'input_player1_l',
  input_player1_l1_btn: 'input_player1_l_btn',
  input_player1_r1: 'input_player1_r',
  input_player1_r1_btn: 'input_player1_r_btn',
}

/** The app's input settings, under the names RetroArch reads them by */
export function toRetroarchInputNames(mapping: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(mapping).map(([name, value]) => [retroarchNames[name] ?? name, value]))
}

// Which of the on-screen gamepad's axes each stick is: 0 and 1 the left stick's, 2 and 3 the right's
const stickAxisNumbers = { l: [0, 1], r: [2, 3] } as const

/**
 * RetroArch settings that make the on-screen gamepad's sticks analog sticks: the left only, or both. The left stick then
 * stays a stick rather than standing in for the D-pad
 */
export function stickAxisSettings(sticks: 'both' | 'left') {
  const settings: Record<string, number | string> = { input_player1_analog_dpad_mode: 0 }
  for (const stick of sticks === 'both' ? (['l', 'r'] as const) : (['l'] as const)) {
    const [x, y] = stickAxisNumbers[stick]
    Object.assign(settings, {
      [`input_player1_${stick}_x_minus_axis`]: `-${x}`,
      [`input_player1_${stick}_x_plus_axis`]: `+${x}`,
      [`input_player1_${stick}_y_minus_axis`]: `-${y}`,
      [`input_player1_${stick}_y_plus_axis`]: `+${y}`,
    })
  }
  return settings
}
