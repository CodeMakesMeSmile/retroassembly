import { isPlainObject } from 'es-toolkit'
import { isMatch } from 'es-toolkit/compat'
import { useRevalidator } from 'react-router'
import { mutate } from 'swr'
import { useSpatialNavigationPaused } from '../atoms.ts'

/**
 * Brings the library up to date after a change (a game added, edited, deleted or favorited): the page's data and the
 * layout's are loaded again, staying on the same page, sort and filter, and earlier search results are forgotten
 */
export function useLibraryRefresh() {
  const { revalidate } = useRevalidator()
  const [, setSpatialNavigationPaused] = useSpatialNavigationPaused()

  return async function refresh() {
    await revalidate()
    await mutate((key) => isPlainObject(key) && isMatch(key, { endpoint: 'roms/search' }), undefined, {
      revalidate: false,
    })
    setSpatialNavigationPaused(false)
  }
}
