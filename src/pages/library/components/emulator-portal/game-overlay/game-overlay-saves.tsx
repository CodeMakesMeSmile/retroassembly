import { useTranslation } from 'react-i18next'
import { useGameOverlay } from '../hooks/use-game-overlay.ts'
import { GameOverlayButton } from './game-overlay-button.tsx'
import { GameStates } from './game-states.tsx'
import { LoadExternalState } from './load-external-state.tsx'

// The pause menu's saves: its saved and auto saved states, opened from the Saves button. Back, the pause key or the
// gamepad's back button return to the menu
export function GameOverlaySaves() {
  const { t } = useTranslation()
  const { back } = useGameOverlay()

  return (
    <>
      <div className='flex shrink-0 items-center gap-4'>
        <div className='game-overlay-back'>
          <GameOverlayButton onClick={back}>
            <span className='icon-[mdi--chevron-left] size-5' />
            {t('common.back')}
          </GameOverlayButton>
        </div>
        <h2 className='text-2xl font-semibold'>{t('emulator.saves')}</h2>
        <span className='flex-1' />
        <LoadExternalState />
      </div>
      <GameStates />
    </>
  )
}
