import { clsx } from 'clsx'
import { DateTime } from 'luxon'
import { useTranslation } from 'react-i18next'
import { getFileUrl } from '#@/pages/library/utils/file.ts'
import { useGameOverlay } from '../hooks/use-game-overlay.ts'
import { useGameStates } from '../hooks/use-game-states.ts'

// The pause menu's way to the saves, beside the volume. It shows the newest save's picture, how many there are and
// how long ago the newest was made, so there's no need to open the saves to see whether there are any
export function GameOverlaySavesButton() {
  const { i18n, t } = useTranslation()
  const { openSaves } = useGameOverlay()
  const { states } = useGameStates()

  const [latest] = states.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const ago = latest
    ? DateTime.fromJSDate(new Date(latest.createdAt)).toRelative({ locale: i18n.language, style: 'short' })
    : ''

  return (
    <button
      className={clsx(
        'game-overlay-saves flex h-12 shrink-0 items-center gap-3 rounded-full border border-solid border-white bg-black/30 pr-3 text-white transition-colors hover:bg-white/15',
        latest ? 'pl-1.5' : 'pl-4 opacity-55',
      )}
      data-sn-enabled
      data-sn-focus-style={JSON.stringify({ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '24px' })}
      onClick={openSaves}
      type='button'
    >
      {latest ? (
        <>
          <img
            alt=''
            className='h-9 w-12 shrink-0 rounded-[14px] border-2 border-solid border-white bg-black object-cover'
            src={getFileUrl(latest.thumbnailFileId)}
          />
          <span className='flex flex-col items-start leading-tight'>
            <span className='text-sm'>{t('emulator.saveCount', { count: states.length })}</span>
            <span className='text-xs opacity-75'>{ago}</span>
          </span>
        </>
      ) : (
        <>
          <span className='icon-[mdi--database-outline] size-5' />
          <span className='text-[15px]'>{t('emulator.noSaves')}</span>
        </>
      )}
      <span className='icon-[mdi--chevron-right] size-5' />
    </button>
  )
}
