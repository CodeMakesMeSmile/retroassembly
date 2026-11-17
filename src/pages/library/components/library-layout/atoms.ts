import { atom, useAtom } from 'jotai'

/**
 * The library's search: what's typed in the box in the sidebar (or the red bar on a phone). It stays on while moving
 * between pages until it's cleared; the game lists show only its matches, and the sidebar how many each has
 */
const searchQueryAtom = atom('')
export function useSearchQuery() {
  return useAtom(searchQueryAtom)
}

/** On a phone, whether the red bar shows the search box in place of the page picker */
const phoneSearchOpenAtom = atom(false)
export function usePhoneSearchOpen() {
  return useAtom(phoneSearchOpenAtom)
}
