import { useGamepads } from './use-gamepads.ts'
import { usePreference } from './use-preference.ts'

/** Whether this controller is Valve's: a Steam Deck, or a controller passed through by Steam, which reports Valve's code */
export function isValveController(gamepad: { id: string } | null | undefined) {
  return Boolean(gamepad && (/\b28de\b/iu.test(gamepad.id) || /steam|valve/iu.test(gamepad.id)))
}

/**
 * Which button confirms and which goes back: as chosen in Settings, or, left on Automatic, Xbox style for a Valve
 * controller (its A is the bottom button, and confirms) and Nintendo style for anything else
 */
export function useConfirmButtonStyle(): 'nintendo' | 'xbox' {
  const { preference } = usePreference()
  const { gamepad } = useGamepads()
  const { confirmButtonStyle } = preference.input
  if (confirmButtonStyle === 'nintendo' || confirmButtonStyle === 'xbox') {
    return confirmButtonStyle
  }
  return isValveController(gamepad) ? 'xbox' : 'nintendo'
}
