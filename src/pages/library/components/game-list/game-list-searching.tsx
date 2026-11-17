import { clsx } from 'clsx'
import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { generatePath, Link, useLoaderData, useLocation } from 'react-router'
import { platformMap, type PlatformName } from '#@/constants/platform.ts'
import { routes } from '#@/pages/routes.ts'
import { useLibrarySearch, withSearch } from '../../hooks/use-library-search.ts'
import { usePlatform } from '../../hooks/use-platform.ts'
import { useSearchCounts } from '../../hooks/use-search-counts.ts'

/**
 * Above a list being searched: what it's searched for and how many games match, with Clear. On a phone, also a row of
 * tabs with each console's matches, since the sidebar with its counts is hidden there
 */
/** Where the row of console tabs was scrolled to, so a tab's page opens with the row as it was when the tab was tapped */
let tabsScrollLeft = 0

export function GameListSearching() {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const { pagination } = useLoaderData<{ pagination?: { total: number } }>()
  const { clear } = useLibrarySearch()
  const platform = usePlatform()
  const counts = useSearchCounts()

  const tabsRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft = tabsScrollLeft
    }
  }, [pathname])

  const query = new URLSearchParams(search).get('q')
  if (!query) {
    return null
  }

  const total = pagination?.total ?? 0
  const games = t('search.gameCount', { count: total })
  let place: string | undefined
  if (platform) {
    place = t(platform.displayNameI18nKey)
  } else if (pathname === routes.libraryFavorites) {
    place = t('nav.favorites')
  } else if (pathname === routes.libraryHistory) {
    place = t('nav.history')
  }
  const consoles = counts ? Object.values(counts.platforms).filter(Boolean).length : 0
  const summary = place
    ? t('search.searchingIn', { games, place, query })
    : t('search.searchingAll', { consoles: t('search.consoleCount', { count: consoles }), games, query })

  const tabs = counts
    ? [
        { count: counts.games, name: '', text: t('search.allGames'), to: routes.libraryRoms },
        ...Object.entries(counts.platforms)
          .filter(([name, count]) => count > 0 && name in platformMap)
          .toSorted(([, a], [, b]) => b - a)
          .map(([name, count]) => ({
            count,
            name,
            text: t(platformMap[name as PlatformName].displayNameI18nKey),
            to: generatePath(routes.libraryPlatform, { platform: name }),
          })),
      ]
    : []
  const activeTab = platform?.name ?? (pathname === routes.libraryRoms ? '' : undefined)

  return (
    <div className='px-4 lg:mb-3'>
      {/* On a phone the search shows in the red bar instead, with its own x */}
      <div className='hidden items-center gap-3 rounded-md bg-(--accent-3) px-3 py-2 text-sm text-(--accent-11) lg:flex'>
        <span className='icon-[mdi--magnify] size-4 shrink-0' />
        <span className='min-w-0 flex-1'>{summary}</span>
        <button className='shrink-0 font-semibold hover:underline' onClick={clear} type='button'>
          {t('common.clear')}
        </button>
      </div>

      {tabs.length > 2 ? (
        <div className='-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden' ref={tabsRef}>
          {tabs.map(({ count, name, text, to }) => (
            <Link
              className={clsx(
                'shrink-0 rounded-full px-3 py-1 text-sm whitespace-nowrap',
                activeTab === name ? 'bg-(--accent-9) text-white' : 'bg-(--gray-3) text-(--gray-12)',
              )}
              key={name || 'all'}
              onClick={() => {
                tabsScrollLeft = tabsRef.current?.scrollLeft ?? 0
              }}
              // Switching console keeps the page where it is, so the tabs stay under the finger
              preventScrollReset
              to={withSearch(to, query)}
            >
              {text}
              <b className={clsx('ml-1.5', activeTab === name ? 'text-white' : 'text-(--accent-11)')}>{count}</b>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
