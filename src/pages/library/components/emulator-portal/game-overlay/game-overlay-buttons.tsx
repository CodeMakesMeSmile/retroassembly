import { useTranslation } from 'react-i18next'
import { useSession } from '#@/pages/library/components/emulator-portal/emulator-session-provider.tsx'
import { focus } from '#@/pages/library/utils/spatial-navigation.ts'
import { useGameOverlay } from '../hooks/use-game-overlay.ts'
import { useGameStates } from '../hooks/use-game-states.ts'
import { GameOverlayButton } from './game-overlay-button.tsx'

export function GameOverlayButtons() {
  const { t } = useTranslation()
  const { emulator, exit } = useSession()
  const { saveManualState } = useGameStates()
  const { hide, isPending, setIsPending } = useGameOverlay()

  async function handleClickResume() {
    await hide()
  }

  async function handleClickRestart() {
    await hide()
    emulator?.restart()
  }

  async function handleClickSaveState() {
    if (isPending) {
      return
    }
    setIsPending(true)
    try {
      await saveManualState()
      focus('.game-overlay button')
    } finally {
      setIsPending(false)
    }
  }

  async function handleClickExit() {
    await hide()
    await exit({ reloadAfterExit: true })
  }

  async function handleClickSaveExit() {
    if (isPending) {
      return
    }
    setIsPending(true)
    try {
      await saveManualState()
      await hide()
      await exit({ reloadAfterExit: true })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <GameOverlayButton dataSnLeft='.game-overlay-buttons button:last-child' onClick={handleClickResume}>
        <span className='icon-[mdi--play] size-5' />
        {t('game.resume')}
      </GameOverlayButton>

      <GameOverlayButton onClick={handleClickSaveState}>
        <span className='icon-[mdi--content-save] size-5' />
        {t('emulator.takeSnapshot')}
      </GameOverlayButton>

      <div className='hidden lg:block lg:flex-1' />

      <GameOverlayButton onClick={handleClickRestart}>
        <span className='icon-[mdi--restart] size-5' />
        {t('emulator.restart')}
      </GameOverlayButton>

      <GameOverlayButton onClick={handleClickExit}>
        <span className='icon-[mdi--exit-to-app] size-5' />
        {t('common.exit')}
      </GameOverlayButton>

      <GameOverlayButton dataSnRight='.game-overlay-buttons button:first-child' onClick={handleClickSaveExit}>
        <span className='icon-[mdi--location-exit] size-5' />
        {t('emulator.saveAndExit')}
      </GameOverlayButton>
    </>
  )
}
