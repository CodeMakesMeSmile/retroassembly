import { useTranslation } from 'react-i18next'
import { generatePath, Link, useLoaderData } from 'react-router'
import { platformMap } from '#@/constants/platform.ts'
import { routes } from '#@/pages/routes.ts'
import type { loader } from '#@/pages/routes/library-home.tsx'
import { getPlatformIcon } from '#@/utils/client/library.ts'
import { HomeRow } from './home-row.tsx'

/** The library's consoles, most games first, each a way to its games */
export function ConsoleRow() {
  const { overview } = useLoaderData<typeof loader>()
  const { i18n, t } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language)
  const consoles = overview.consoles.filter(({ platform }) => platform in platformMap)
  if (consoles.length < 2) {
    return null
  }
  return (
    <div id='consoles'>
      <HomeRow title={t('home.consoles')}>
        {consoles.map(({ count, platform }) => {
          const name = t(platformMap[platform].displayNameI18nKey)
          return (
            <Link
              className='flex w-28 shrink-0 flex-col gap-1 rounded-lg border border-(--gray-5) p-2.5 hover:border-(--accent-7) lg:w-32'
              key={platform}
              to={generatePath(routes.libraryPlatform, { platform })}
            >
              <img alt='' className='size-8 object-contain' src={getPlatformIcon(platform)} />
              <span className='line-clamp-2 text-sm leading-tight font-semibold'>{name}</span>
              <span className='text-xs text-(--gray-11)'>
                {t('home.gameCount', { count, formatted: format.format(count) })}
              </span>
            </Link>
          )
        })}
      </HomeRow>
    </div>
  )
}
