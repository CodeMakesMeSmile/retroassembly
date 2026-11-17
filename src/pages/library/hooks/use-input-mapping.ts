import { useMemo } from 'react'
import { useConfirmButtonStyle } from './use-confirm-button-style.ts'
import { useGamepadMapping } from './use-gamepad-mapping.ts'
import { useKeyboardMapping } from './use-keyboard-mapping.ts'

export function useInputMapping() {
  const gamepadMapping = useGamepadMapping()
  const keyboardMapping = useKeyboardMapping()
  const confirmButtonStyle = useConfirmButtonStyle()

  const confirmKey = {
    nintendo: keyboardMapping.input_player1_a,
    xbox: keyboardMapping.input_player1_b,
  }[confirmButtonStyle]

  const cancelKey = {
    nintendo: keyboardMapping.input_player1_b,
    xbox: keyboardMapping.input_player1_a,
  }[confirmButtonStyle]

  const confirmButton = {
    nintendo: gamepadMapping.input_player1_a_btn,
    xbox: gamepadMapping.input_player1_b_btn,
  }[confirmButtonStyle]

  const cancelButton = {
    nintendo: gamepadMapping.input_player1_b_btn,
    xbox: gamepadMapping.input_player1_a_btn,
  }[confirmButtonStyle]

  const mapping = useMemo(
    () => ({
      cancelButton,
      cancelKey,
      confirmButton,
      confirmKey,
      gamepad: gamepadMapping,
      keyboard: keyboardMapping,
    }),
    [gamepadMapping, keyboardMapping, cancelButton, cancelKey, confirmButton, confirmKey],
  )
  return mapping
}
