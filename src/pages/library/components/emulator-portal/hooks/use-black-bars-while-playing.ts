import { useEffect } from 'react'
import { useEmulatorLaunched } from '#@/pages/library/atoms.ts'

/**
 * While a game runs, the phone's own strips above and below the page (by the clock, and at the bottom) are black instead
 * of the app's red, so they don't draw the eye from the game. Safari colours them from the theme colour, the app on the
 * home screen from what's behind them, and Android shows the page there, so the page is hidden while playing
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
    // The page itself is hidden too: on Android the game's layer stops short of the strip at the bottom of the screen,
    // where the page's red showed through. The game and its controls are outside the page, so they stay
    const page = document.querySelector<HTMLElement>('.library-layout')
    page?.style.setProperty('visibility', 'hidden')
    return () => {
      if (themeColor) {
        meta?.setAttribute('content', themeColor)
      }
      documentElement.style.backgroundColor = background
      page?.style.removeProperty('visibility')
    }
  }, [launched])
}
