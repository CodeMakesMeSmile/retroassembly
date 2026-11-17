import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generatePath, useLoaderData } from 'react-router'
import { platformMap, type PlatformName } from '#@/constants/platform.ts'
import { routes } from '#@/pages/routes.ts'
import type { loader } from '#@/pages/routes/library-consoles.tsx'
import { getPlatformBanner, getPlatformDevicePhoto, getPlatformIcon } from '#@/utils/client/library.ts'
import { NavigatableLink } from '../components/navigatable-link.tsx'
import { usePreference } from '../hooks/use-preference.ts'

/** The console's photo, or its logo where there's no photo */
function ConsolePicture({ name, platform }: Readonly<{ name: string; platform: PlatformName }>) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <img alt={name} className='size-full object-contain p-6' loading='lazy' src={getPlatformBanner(platform)} />
  ) : (
    <img
      alt={name}
      className='size-full object-contain drop-shadow-lg transition-transform group-hover:scale-105'
      loading='lazy'
      onError={() => setFailed(true)}
      src={getPlatformDevicePhoto(platform)}
    />
  )
}

/** Every console in the library, A to Z as in the sidebar, each a card with its photo, opening its games */
export default function ConsolesPage() {
  const { consoles } = useLoaderData<typeof loader>()
  const { preference } = usePreference()
  const { i18n, t } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language)

  const counts = new Map(consoles.map(({ count, platform }) => [platform, count]))
  const cards = preference.ui.platforms
    .filter((platform) => platform in platformMap)
    .map((platform) => ({
      count: counts.get(platform) ?? 0,
      name: t(platformMap[platform].displayNameI18nKey),
      platform,
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name, i18n.language))
  const games = cards.reduce((sum, { count }) => sum + count, 0)

  return (
    <div className='p-4 lg:mx-auto lg:max-w-[1664px] lg:p-8'>
      <h1 className='text-3xl font-bold'>{t('nav.consoles')}</h1>
      <p className='mt-1 mb-5 text-sm text-(--gray-11)'>
        {t('nav.consolesSummary', {
          consoles: `${format.format(cards.length)} ${t('home.statConsoles', { count: cards.length })}`,
          games: t('home.gameCount', { count: games, formatted: format.format(games) }),
        })}
      </p>

      <div
        data-sn-section=''
        className='grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] lg:gap-4'
      >
        {cards.map(({ count, name, platform }) => (
          <NavigatableLink
            className='group flex flex-col overflow-hidden rounded-xl border border-(--gray-5) bg-(--color-background) hover:border-(--accent-7)'
            key={platform}
            to={generatePath(routes.libraryPlatform, { platform })}
          >
            <div className='aspect-[16/10] overflow-hidden bg-linear-to-br from-(--gray-2) to-(--gray-4) p-3.5'>
              <ConsolePicture name={name} platform={platform} />
            </div>
            <div className='flex items-center gap-2 px-3 pt-2.5 pb-3'>
              <img alt='' className='size-6 shrink-0 object-contain' src={getPlatformIcon(platform)} />
              <div className='min-w-0'>
                <div className='leading-tight font-semibold'>{name}</div>
                <div className='text-xs text-(--gray-11)'>
                  {t('home.gameCount', { count, formatted: format.format(count) })}
                </div>
              </div>
            </div>
          </NavigatableLink>
        ))}
      </div>
    </div>
  )
}
