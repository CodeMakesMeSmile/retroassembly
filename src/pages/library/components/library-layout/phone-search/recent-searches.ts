// The last few searches made in the phone's search screen, kept in this browser, newest first

const storageKey = 'retroassembly:recent-searches'
const kept = 6

export function readRecentSearches(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, kept) : []
  } catch {
    return []
  }
}

export function addRecentSearch(query: string) {
  const searches = [query, ...readRecentSearches().filter((item) => item.toLowerCase() !== query.toLowerCase())]
  try {
    localStorage.setItem(storageKey, JSON.stringify(searches.slice(0, kept)))
  } catch {}
}
