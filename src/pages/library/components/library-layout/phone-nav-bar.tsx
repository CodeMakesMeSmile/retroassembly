import { clsx } from 'clsx'
import { Link } from 'react-router'
import { withSearch } from '../../hooks/use-library-search.ts'
import { useNavigationLinks } from '../../hooks/use-navigation-links.ts'
import { usePlatform } from '../../hooks/use-platform.ts'
import { useSearchQuery } from './atoms.ts'

/**
 * On a phone, Home, Games, Favorites and History in a bar pinned to the bottom, so they're a tap away however far down
 * the page is scrolled. A console's page, or a game's, is part of Games, so Games is lit there
 */
export function PhoneNavBar() {
  const { groups, isActive } = useNavigationLinks()
  const platform = usePlatform()
  const [query] = useSearchQuery()
  const [{ links }] = groups

  return (
    <nav className='px-safe pb-safe fixed inset-x-0 bottom-0 z-2 flex bg-(--accent-9) text-white shadow-[0_-2px_8px_rgb(0_0_0/0.12)] lg:hidden'>
      {links.map(({ iconClass, name, text, to }) => {
        const active = isActive(to) || (name === 'library' && Boolean(platform))
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={clsx('flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', {
              'font-bold': active,
              'opacity-75': !active,
            })}
            key={name}
            to={withSearch(to, query)}
          >
            <span className={clsx('grid place-items-center rounded-xl px-3.5 py-0.5', { 'bg-white/20': active })}>
              <span className={clsx('size-6', iconClass)} />
            </span>
            {text}
          </Link>
        )
      })}
    </nav>
  )
}
