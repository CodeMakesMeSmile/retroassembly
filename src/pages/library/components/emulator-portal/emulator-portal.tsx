import { useLayoutEffect } from 'react'
import { useNavigation } from 'react-router'
import { RadixThemePortal } from '#@/pages/components/radix-theme-portal.tsx'
import { useSession } from '#@/pages/library/components/emulator-portal/emulator-session-provider.tsx'
import { GameAnimatePresence } from './game-animate-presence.tsx'
import { GameOverlay } from './game-overlay/game-overlay.tsx'

export function EmulatorPortal() {
  const navigation = useNavigation()
  const { exit } = useSession()

  useLayoutEffect(() => {
    if (navigation.state === 'loading') {
      ;(async () => {
        await exit()
      })()
    }
    document.body.style.removeProperty('overflow')
  }, [exit, navigation.state])

  return (
    <RadixThemePortal>
      <GameOverlay />
      <GameAnimatePresence />
    </RadixThemePortal>
  )
}
