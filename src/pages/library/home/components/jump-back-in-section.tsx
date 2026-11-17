import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { generatePath, NavLink, useLoaderData } from 'react-router'
import { platformMap } from '#@/constants/platform.ts'
import { routes } from '#@/pages/routes.ts'
import type { loader } from '#@/pages/routes/library-home.tsx'
import { getPlatformIcon, getRomGoodcodes } from '#@/utils/client/library.ts'
import { GameButtons } from '../../components/game-buttons/game-buttons.tsx'
import { GameEntryImage } from '../../components/game-entry/game-entry-image.tsx'
import { RomBackground } from '../../components/rom-background.tsx'

type HomeRom = Awaited<ReturnType<typeof loader>>['rom']

export function JumpBackInSection() {
  const { rom } = useLoaderData<typeof loader>()
  const { t } = useTranslation()

  if (!rom) {
    return
  }

  return (
    <section className='relative'>
      <RomBackground className='lg:absolute' rom={rom} />

      <div className='relative rounded bg-linear-to-b from-(--gray-a4) via-transparent to-transparent p-4'>
        <h2 className='flex items-center gap-2 px-1 pb-3 text-xl font-semibold text-(--accent-9) lg:p-4 lg:text-2xl'>
          <span className='icon-[mdi--play-circle-outline]' />
          {t('common.continue')}
        </h2>

        {/* A compact card, so the game doesn't fill the screen: the cover beside its name, the buttons below on a phone */}
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6'>
          <div className='flex items-center gap-4'>
            <div className='flex w-26 shrink-0 items-center justify-center lg:w-45'>
              <GameEntryImage centered rom={rom} />
            </div>
            <div className='min-w-0 lg:hidden'>
              <GameTitle rom={rom} size='small' />
            </div>
          </div>
          <div className='flex flex-col justify-center gap-4'>
            <div className='hidden lg:block'>
              <GameTitle rom={rom} size='large' />
            </div>

            {/* Download the game only when it's launched, so opening the library stays quick */}
            <GameButtons compact lazy />
          </div>
        </div>
      </div>
    </section>
  )
}

/** The game's name, a link to its page, with its console under it */
function GameTitle({ rom, size }: Readonly<{ rom: NonNullable<HomeRom>; size: 'large' | 'small' }>) {
  const { t } = useTranslation()
  return (
    <div className='flex flex-col gap-1 lg:gap-2'>
      <NavLink
        className='group flex items-center gap-2'
        to={generatePath(routes.libraryPlatformRom, { fileName: rom.fileName, platform: rom.platform })}
      >
        {({ isPending }) => (
          <>
            <h3 className={clsx('font-semibold', size === 'small' ? 'text-xl leading-tight' : 'text-3xl')}>
              {getRomGoodcodes(rom).rom}
            </h3>
            <span
              className={clsx('icon-[svg-spinners--180-ring] shrink-0 opacity-0', {
                'group-focus:opacity-50': isPending,
              })}
            />
          </>
        )}
      </NavLink>

      <div className='flex items-center gap-1 text-sm text-(--color-text)/40 lg:text-base'>
        <img
          alt={t(platformMap[rom.platform].displayNameI18nKey)}
          className='size-5 lg:size-6'
          loading='lazy'
          src={getPlatformIcon(platformMap[rom.platform].name)}
        />
        {t(platformMap[rom.platform].displayNameI18nKey)}
      </div>
    </div>
  )
}
