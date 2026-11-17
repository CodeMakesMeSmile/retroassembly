import { useTranslation } from 'react-i18next'
import { Link, useLoaderData } from 'react-router'
import { routes } from '#@/pages/routes.ts'
import type { loader } from '#@/pages/routes/library-home.tsx'

/** The library at a glance: four numbers, each a way into the library */
export function LibraryStats() {
  const { overview } = useLoaderData<typeof loader>()
  const { i18n, t } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language)
  const { consoles, favorites, games, playedThisMonth } = overview.stats
  const items = [
    { count: games, label: t('home.statGames', { count: games }), to: routes.libraryRoms },
    { count: consoles, label: t('home.statConsoles', { count: consoles }), to: routes.libraryConsoles },
    { count: playedThisMonth, label: t('home.statPlayedThisMonth'), to: routes.libraryHistory },
    { count: favorites, label: t('home.statFavorites', { count: favorites }), to: routes.libraryFavorites },
  ]
  return (
    <div className='mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3'>
      {items.map(({ count, label, to }) => (
        <Link className='rounded-lg border border-(--gray-5) px-3 py-2 hover:border-(--accent-7)' key={label} to={to}>
          <div className='text-xl leading-tight font-bold text-(--accent-11) tabular-nums lg:text-2xl'>
            {format.format(count)}
          </div>
          <div className='text-xs text-(--gray-11) lg:text-sm'>{label}</div>
        </Link>
      ))}
    </div>
  )
}
