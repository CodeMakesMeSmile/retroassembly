import { Trans, useTranslation } from 'react-i18next'
import { useLoaderData } from 'react-router'
import type { loader } from '#@/pages/routes/library-roms.tsx'
import { GameListMain } from '../components/game-list-main.tsx'
import LibraryLayout from '../components/library-layout/library-layout.tsx'
import { PageStats } from '../components/page-stats.tsx'
import { UploadSelectButton } from '../platform/components/upload-select-button.tsx'

export default function LibraryROMsPage() {
  const { t } = useTranslation()
  const { pagination, platformCount, roms } = useLoaderData<typeof loader>()
  const gameLabel = t('common.game', { count: pagination.total })
  const platformLabel = t('common.platform', { count: platformCount })

  if (pagination.current > 1 && roms.length === 0) {
    return <>404</>
  }

  return (
    <LibraryLayout>
      <GameListMain>
        <div>
          <h1 className='text-5xl font-semibold'>{t('common.games')}</h1>
        </div>

        <PageStats suffix={<UploadSelectButton />}>
          <span className='icon-[mdi--bar-chart] text-(--color-text)' />
          <Trans
            components={{
              1: <span className='font-semibold text-(--accent-9)' />,
              3: <span className='font-semibold text-(--accent-9)' />,
            }}
            i18nKey='stats.totalGames'
            values={{
              game: gameLabel,
              gameCount: pagination.total,
              platform: platformLabel,
              platformCount,
            }}
          />
        </PageStats>
      </GameListMain>
    </LibraryLayout>
  )
}
