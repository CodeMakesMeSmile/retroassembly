import { atom, useAtom } from 'jotai'
import { useEffect } from 'react'

// Whether a game shows its on-screen controls: decided by how it's being played, not by the screen's size, so an iPad
// held sideways gets them though it's as wide as a small laptop. A device you mainly touch starts with them; touching
// the screen brings them in, and a key on a real keyboard puts them away, so an iPad with a keyboard case or a laptop
// with a touch screen gets whichever you're using. A connected controller hides them too (see the on-screen gamepad)

function touchIsMainPointer() {
  return globalThis.matchMedia?.('(pointer: coarse)').matches ?? false
}

const touchControlsAtom = atom(touchIsMainPointer())

export function useTouchControls() {
  const [touchControls] = useAtom(touchControlsAtom)
  return touchControls
}

/** Follows which way the game is being played; used once, by the game's overlay */
export function useFollowTouchControls() {
  const [, setTouchControls] = useAtom(touchControlsAtom)

  useEffect(() => {
    const abortController = new AbortController()
    const options = { capture: true, signal: abortController.signal }
    globalThis.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType === 'touch') {
          setTouchControls(true)
        }
      },
      options,
    )
    globalThis.addEventListener(
      'keydown',
      (event) => {
        // Only a key really pressed: the on-screen buttons send key presses of their own
        if (event.isTrusted) {
          setTouchControls(false)
        }
      },
      options,
    )
    return () => abortController.abort()
  }, [setTouchControls])
}
