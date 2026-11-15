import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { resolveConsole } from '#@/consoles/registry.ts'
import { defaultPreference } from '#@/constants/preference.ts'
import { buildInputConfig, combineRules } from '#@/input/build-input-config.ts'

// The fixtures record the input settings and keyboard hints the app produced before the input model; it must produce
// the same, except for the app's own hotkey names ($pause and so on), which are no longer passed to RetroArch
async function readFixture(name: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8'))
}
const recordedSettings = await readFixture('input-settings.json')
const recordedHints = await readFixture('input-hints.json')

const remapDirectory = '/home/web_user/retroarch/userdata/config/remaps'
const defaultKeyboard: Record<string, string> = defaultPreference.input.keyboardMapping
const keyboards = {
  custom: {
    ...defaultKeyboard,
    input_player1_a: 'k',
    input_player1_l_y_minus: 'i',
    input_player1_l_y_plus: 'j',
    input_player1_l2: 'e',
    input_player1_select: 'num1',
    input_rewind: 'm',
  },
  default: defaultKeyboard,
}

// The gamepad mapping with its hotkey buttons resolved, as useGamepadMapping does
function resolveGamepad(mapping: Record<string, string>) {
  const buttons: Record<string, string> = {
    L1: mapping.input_player1_l1_btn,
    L2: mapping.input_player1_l2_btn,
    L3: mapping.input_player1_l3_btn,
    R1: mapping.input_player1_r1_btn,
    R2: mapping.input_player1_r2_btn,
    R3: mapping.input_player1_r3_btn,
    Select: mapping.input_player1_select_btn,
    Start: mapping.input_player1_start_btn,
  }
  const [fastForwardKey, fastForwardPrefix] = mapping.$fast_forward.split(/\s+\+\s/u).toReversed()
  const [rewindKey] = mapping.$rewind.split(/\s+\+\s/u).toReversed()
  return {
    ...mapping,
    input_enable_hotkey_btn: buttons[fastForwardPrefix] || 'nul',
    input_hold_fast_forward_btn: buttons[fastForwardKey],
    input_rewind_btn: buttons[rewindKey],
  }
}
const defaultGamepad = {
  $fast_forward: 'Select + R2',
  $pause: 'L1 + R1',
  $rewind: 'Select + L2',
  input_player1_a_btn: '1',
  input_player1_b_btn: '0',
  input_player1_down_btn: '13',
  input_player1_l1_btn: '4',
  input_player1_l2_btn: '6',
  input_player1_l3_btn: '10',
  input_player1_left_btn: '14',
  input_player1_r1_btn: '5',
  input_player1_r2_btn: '7',
  input_player1_r3_btn: '11',
  input_player1_right_btn: '15',
  input_player1_select_btn: '8',
  input_player1_start_btn: '9',
  input_player1_up_btn: '12',
  input_player1_x_btn: '3',
  input_player1_y_btn: '2',
}
const gamepads = {
  custom: resolveGamepad({
    ...defaultGamepad,
    $fast_forward: 'Start + R1',
    $rewind: 'L3',
    input_player1_a_btn: '0',
    input_player1_b_btn: '1',
  }),
  default: resolveGamepad(defaultGamepad),
}

function withoutAppHotkeys(settings: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(settings).filter(([name]) => !name.startsWith('$')))
}

await describe('input model', async () => {
  for (const [name, expected] of Object.entries(recordedSettings)) {
    await it(`builds the input settings for ${name} as before`, () => {
      const [pair, keyboard, gamepad, touch] = name.split(' ').map((part) => part.split('=').at(-1) ?? part)
      const [platform, core] = pair.split('/')
      const { retroarchConfig } = buildInputConfig({
        console: resolveConsole(platform, core),
        gamepad: gamepads[gamepad as keyof typeof gamepads],
        keyboard: keyboards[keyboard as keyof typeof keyboards],
        remapDirectory,
        touch: touch === 'true',
      })
      assert.deepEqual(retroarchConfig, withoutAppHotkeys(expected))
    })
  }

  for (const [name, expected] of Object.entries(recordedHints)) {
    await it(`gives the keyboard hints for ${name} as before`, () => {
      const [pair, keyboard] = name.split(' ').map((part) => part.split('=').at(-1) ?? part)
      const [platform, core] = pair.split('/')
      const { hints } = buildInputConfig({
        console: resolveConsole(platform, core),
        gamepad: gamepads.default,
        keyboard: keyboards[keyboard as keyof typeof keyboards],
        remapDirectory,
        touch: false,
      })
      assert.deepEqual(hints, expected)
    })
  }

  await it('refuses a rule that overwrites another without saying so', () => {
    assert.throws(
      () =>
        combineRules([
          { name: 'first', settings: { input_player1_a: 'x' } },
          { name: 'second', settings: { input_player1_a: 'z' } },
        ]),
      /second rule writes input_player1_a, which the first rule already wrote/u,
    )
    assert.deepEqual(
      combineRules([
        { name: 'first', settings: { input_player1_a: 'x' } },
        { name: 'second', replaces: ['first'], settings: { input_player1_a: 'z' } },
      ]),
      { input_player1_a: 'z' },
    )
  })
})
