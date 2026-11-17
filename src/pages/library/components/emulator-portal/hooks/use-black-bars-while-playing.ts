import { useEffect } from 'react'
import { useEmulatorLaunched } from '#@/pages/library/atoms.ts'

/**
 * While a game runs, the phone's own strips above and below the page (by the clock, and at the bottom) are black instead
 * of the app's red, so they don't draw the eye from the game. Safari colours them from the theme colour, and the app on
 * the home screen from what's behind them
 */
export function useBlackBarsWhilePlaying() {
  const [launched] = useEmulatorLaunched()

  useEffect(() => {
    if (!launched) {
      return
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    const themeColor = meta?.getAttribute('content')
    const { documentElement } = document
    const background = documentElement.style.backgroundColor
    meta?.setAttribute('content', '#000000')
    documentElement.style.backgroundColor = '#000000'
    return () => {
      if (themeColor) {
        meta?.setAttribute('content', themeColor)
      }
      documentElement.style.backgroundColor = background
    }
  }, [launched])
}
