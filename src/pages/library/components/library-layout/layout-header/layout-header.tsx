import { Select } from '@radix-ui/themes'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Logo } from '#@/pages/components/logo.tsx'
import { useViewport } from '#@/pages/library/hooks/use-viewport.ts'
import { routes } from '#@/pages/routes.ts'
import { withSearch } from '../../../hooks/use-library-search.ts'
import { useNavigationLinks } from '../../../hooks/use-navigation-links.ts'
import { getLinkCount, useSearchCounts } from '../../../hooks/use-search-counts.ts'
import { usePhoneSearchOpen, useSearchQuery } from '../atoms.ts'
import { LayoutMenu } from '../layout-menu/layout-menu.tsx'
import { SearchField } from '../search-field.tsx'
import { UploadBadge } from '../upload-badge.tsx'
import { HeaderLinkItem } from './header-link-item.tsx'

export function LayoutHeader() {
  const navitate = useNavigate()
  const { groups, isActive } = useNavigationLinks()
  const { isNotLargeScreen } = useViewport()
  const { t } = useTranslation()
  const [query] = useSearchQuery()
  const counts = useSearchCounts()
  const [searchOpen, setSearchOpen] = usePhoneSearchOpen()

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
      <header className='px-safe-offset-2 fixed inset-x-0 top-0 z-2 flex items-center bg-(--accent-9) py-2 lg:hidden'>
        <UploadBadge className='absolute inset-x-0 top-full flex items-center justify-center gap-2 bg-(--accent-9) py-1 text-xs text-white' />
        {searchOpen ? (
          // The search box across the bar; Cancel puts the page picker back, and the search stays until it's cleared
          <div className='flex flex-1 items-center gap-3 pr-2'>
            <SearchField inBar onDone={() => setSearchOpen(false)} />
            <button className='text-sm text-white' onClick={() => setSearchOpen(false)} type='button'>
              {t('common.cancel')}
            </button>
          </div>
        ) : null}

        <Link className={searchOpen ? 'hidden' : 'flex items-center gap-2 font-bold'} to={routes.libraryHome}>
          <Logo height='32' width='32' />
        </Link>

        <div className={searchOpen ? 'hidden' : 'flex h-5 flex-1 justify-center'}>
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
                        <HeaderLinkItem count={getLinkCount(counts, link.name)} link={link} />
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
          className={searchOpen ? 'hidden' : 'grid size-8 place-items-center text-white'}
          onClick={() => setSearchOpen(true)}
          title={t('common.search')}
          type='button'
        >
          <span className={query ? 'icon-[mdi--text-search] size-6' : 'icon-[mdi--magnify] size-6'} />
        </button>

        <div className={searchOpen ? 'hidden' : '-mr-3 h-8 w-10'}>{isNotLargeScreen ? <LayoutMenu /> : null}</div>
      </header>
      <div className='h-12 w-full bg-(--accent-9) lg:hidden' />
    </>
  )
}
