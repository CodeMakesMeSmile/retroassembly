import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { generatePath, Link, useLocation } from 'react-router'
import { platformMap, type PlatformName } from '#@/constants/platform.ts'
import { routes } from '#@/pages/routes.ts'
import { withSearch } from '../../hooks/use-library-search.ts'
import { usePlatform } from '../../hooks/use-platform.ts'
import { useSearchCounts } from '../../hooks/use-search-counts.ts'

/**
 * On a phone, above a list being searched: a row of tabs with each console's matches, since the sidebar with its counts
 * is hidden there. On a computer the sidebar shows them, and the search box clears the search
 */

/** Where the row of console tabs was scrolled to, so a tab's page opens with the row as it was when the tab was tapped */
let tabsScrollLeft = 0

export function GameListSearching() {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const platform = usePlatform()
  const counts = useSearchCounts()

  const query = new URLSearchParams(search).get('q')
  if (!query) {
    return null
  }

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
    <div className='px-4 lg:hidden' data-sn-section=''>
      {tabs.length > 2 ? (
        <div
          className='-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden'
          key={pathname}
          ref={(row) => {
            if (row) {
              row.scrollLeft = tabsScrollLeft
            }
          }}
        >
          {tabs.map(({ count, name, text, to }) => (
            <Link
              className={clsx(
                'shrink-0 rounded-full px-3 py-1 text-sm whitespace-nowrap',
                activeTab === name ? 'bg-(--accent-9) text-white' : 'bg-(--gray-3) text-(--gray-12)',
              )}
              key={name || 'all'}
              onClick={(event) => {
                tabsScrollLeft = event.currentTarget.parentElement?.scrollLeft ?? 0
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
