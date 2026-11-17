import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { routes } from '#@/pages/routes.ts'
import { useSearchQuery } from '../components/library-layout/atoms.ts'

/** The sort and order each list had before a search started there, to go back to when it's cleared */
const sortsBeforeSearch = new Map<string, { direction: null | string; sort: null | string }>()

export function normalizeSearch(text: string) {
  return text.trim().replaceAll(/\s+/gu, ' ').slice(0, 100)
}

/** The pages a search filters: Games, Favorites, History and each console's games */
export function isSearchablePath(pathname: string) {
  return (
    pathname === routes.libraryRoms ||
    pathname === routes.libraryFavorites ||
    pathname === routes.libraryHistory ||
    /^\/library\/platform\/[^/]+\/?$/u.test(pathname)
  )
}

/** A link to one of those pages that keeps the search on, from its first page */
export function withSearch(to: string, query: string) {
  const [path, queryString = ''] = to.split('?')
  if (!query || !isSearchablePath(path)) {
    return to
  }
  const params = new URLSearchParams(queryString)
  params.set('q', query)
  params.delete('page')
  return `${path}?${params}`
}

/**
 * Starts, changes or clears the search. On a page it filters, the search goes into the address and the list shows its
 * matches, best match first; anywhere else it opens the Games page with them
 */
export function useLibrarySearch() {
  const [query, setQuery] = useSearchQuery()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  async function apply(value: string) {
    const next = normalizeSearch(value)
    setQuery(next)
    if (!isSearchablePath(pathname)) {
      if (next) {
        await navigate(withSearch(routes.libraryRoms, next))
      }
      return
    }
    const params = new URLSearchParams(search)
    const addressQuery = params.get('q') ?? ''
    if (next === addressQuery) {
      return
    }
    params.delete('page')
    if (next) {
      if (!addressQuery) {
        sortsBeforeSearch.set(pathname, { direction: params.get('direction'), sort: params.get('sort') })
        params.delete('sort')
        params.delete('direction')
      }
      params.set('q', next)
    } else {
      params.delete('q')
      params.delete('sort')
      params.delete('direction')
      const before = sortsBeforeSearch.get(pathname)
      if (before?.sort) {
        params.set('sort', before.sort)
      }
      if (before?.direction) {
        params.set('direction', before.direction)
      }
      sortsBeforeSearch.delete(pathname)
    }
    // Typing more replaces the search in the history, so Back leaves the search rather than undoing a letter
    await navigate(params.size > 0 ? `${pathname}?${params}` : pathname, {
      preventScrollReset: true,
      replace: Boolean(addressQuery && next),
    })
  }

  return { apply, clear: () => apply(''), query }
}

/**
 * Keeps the search in step with the address: on a page the search filters, the address says what's searched for, as
 * after Back or opening a link. Elsewhere, such as Home or a game's page, the search stays as it was
 */
export function useSearchFromAddress() {
  const [, setQuery] = useSearchQuery()
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (isSearchablePath(pathname)) {
      setQuery(normalizeSearch(new URLSearchParams(search).get('q') ?? ''))
    }
  }, [pathname, search, setQuery])
}
