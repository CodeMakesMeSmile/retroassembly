import { clsx } from 'clsx'
import { withSearch } from '../../../hooks/use-library-search.ts'
import { useNavigationLinks } from '../../../hooks/use-navigation-links.ts'
import { getLinkCount, useSearchCounts } from '../../../hooks/use-search-counts.ts'
import { useSearchQuery } from '../atoms.ts'
import { SearchField } from '../search-field.tsx'
import { SidebarLink } from './sidebar-link.tsx'

/**
 * The sidebar's links. `pinned` is the search box and Home to History, which stay in place; `rest` is the consoles, which
 * scroll under them
 */
export function SidebarLinks({ part }: Readonly<{ part: 'pinned' | 'rest' }>) {
  const { groups, isActive } = useNavigationLinks()
  const [query] = useSearchQuery()
  const counts = useSearchCounts()
  const shownGroups = part === 'pinned' ? groups.slice(0, 1) : groups.slice(1)

  return (
    <div className={clsx('w-64', { 'mb-2 border-b border-b-white/30 pb-3': part === 'pinned' })}>
      {part === 'pinned' ? (
        <div className='mb-3'>
          <SearchField />
        </div>
      ) : null}

      {shownGroups.map(({ links, title }, index) => (
        <div className={clsx({ 'mt-4': index })} key={title}>
          {title ? (
            <h3 className='flex items-center gap-2 px-4 text-sm text-white/50 capitalize'>
              <span className='icon-[mdi--gamepad-classic] size-5 p-0.5' />
              {title}
            </h3>
          ) : null}

          <div className={clsx('flex w-full flex-col gap-y-2 overflow-hidden', { 'mt-2': title })}>
            {links.map(({ iconClass, iconUrl, name, text, to }) => {
              // While searching, how many of the link's games match; a link with none is dimmed but stays in place
              const count = getLinkCount(counts, name)
              return (
                <div className={clsx('relative flex items-center', { 'opacity-50': count === 0 })} key={name}>
                  <SidebarLink active={isActive(to)} title={text} to={withSearch(to, query)}>
                    {iconClass ? <span className={clsx('size-5 p-0.5', iconClass)} /> : null}

                    {iconUrl ? <img alt={text} className='block size-6' src={iconUrl} /> : null}

                    <span className={clsx('truncate', { 'opacity-90 group-hover:opacity-100': !isActive(to) })}>
                      {text}
                    </span>

                    {count === undefined ? null : (
                      <span
                        className={clsx(
                          'ml-auto shrink-0 rounded-full px-2 text-xs leading-5 font-bold tabular-nums',
                          count ? 'bg-white text-(--accent-9)' : 'font-normal text-white',
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </SidebarLink>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
