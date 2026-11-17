import { Select } from '@radix-ui/themes'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Logo } from '#@/pages/components/logo.tsx'
import { useViewport } from '#@/pages/library/hooks/use-viewport.ts'
import { routes } from '#@/pages/routes.ts'
import { useLibrarySearch, withSearch } from '../../../hooks/use-library-search.ts'
import { useNavigationLinks } from '../../../hooks/use-navigation-links.ts'
import { LayoutMenu } from '../layout-menu/layout-menu.tsx'
import { useOpenPhoneSearch } from '../phone-search/phone-search-screen.tsx'
import { UploadBadge } from '../upload-badge.tsx'
import { HeaderLinkItem } from './header-link-item.tsx'

export function LayoutHeader() {
  const navitate = useNavigate()
  const { groups, isActive } = useNavigationLinks()
  const { isNotLargeScreen } = useViewport()
  const { t } = useTranslation()
  const { clear, query } = useLibrarySearch()
  const openSearch = useOpenPhoneSearch()

  const groupLinks = groups.flatMap(({ links }) => links)
  const currentLink = groupLinks.find(({ to }) => isActive(to))
  const currentRouteName = currentLink?.name

  async function handleValueChange(value: string) {
    const link = groupLinks.find(({ name }) => name === value)
    if (link?.to) {
      await navitate(withSearch(link.to, query))
    }
  }

  return (
    <>
      <header className='px-safe-offset-2 fixed inset-x-0 top-0 z-2 flex items-center gap-2 bg-(--accent-9) py-2 lg:hidden'>
        <UploadBadge className='absolute inset-x-0 top-full flex items-center justify-center gap-2 bg-(--accent-9) py-1 text-xs text-white' />

        <Link className='flex shrink-0 items-center gap-2 font-bold' to={routes.libraryHome}>
          <Logo height='32' width='32' />
        </Link>

        {query ? (
          // A search is on: shown in the bar so it's never on unseen. Tapping it opens the search screen with it, the x
          // ends it
          <div className='flex min-w-0 flex-1 justify-center'>
            <div className='flex h-8 max-w-full min-w-0 items-center rounded-full bg-white/20 text-sm text-white'>
              <button
                className='flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-3'
                onClick={() => openSearch(query)}
                type='button'
              >
                <span className='icon-[mdi--magnify] size-4 shrink-0' />
                <span className='truncate'>{query}</span>
              </button>
              <button
                aria-label={t('common.clear')}
                className='grid size-8 shrink-0 place-items-center'
                onClick={clear}
                title={t('common.clear')}
                type='button'
              >
                <span className='icon-[mdi--close] size-4' />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className='flex h-5 flex-1 justify-center'>
              <Select.Root onValueChange={handleValueChange} size='2' value={currentRouteName}>
                <Select.Trigger className='text-white!' variant='ghost'>
                  <HeaderLinkItem link={currentLink} />
                </Select.Trigger>
                <Select.Content>
                  {groups.map(({ links, title }, i) => (
                    <Fragment key={title}>
                      <Select.Group>
                        {links.map((link) => (
                          <Select.Item key={link.name} value={link.name}>
                            <HeaderLinkItem link={link} />
                          </Select.Item>
                        ))}
                      </Select.Group>
                      {i < groups.length - 1 ? <Select.Separator /> : null}
                    </Fragment>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>

            <button
              aria-label={t('common.search')}
              className='grid size-8 shrink-0 place-items-center text-white'
              onClick={() => openSearch('')}
              title={t('common.search')}
              type='button'
            >
              <span className='icon-[mdi--magnify] size-6' />
            </button>
          </>
        )}

        <div className='-mr-3 h-8 w-10 shrink-0'>{isNotLargeScreen ? <LayoutMenu /> : null}</div>
      </header>
      <div className='h-12 w-full bg-(--accent-9) lg:hidden' />
    </>
  )
}
