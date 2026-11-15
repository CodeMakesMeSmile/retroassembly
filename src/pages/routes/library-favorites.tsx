import { loadFavoritesPage } from '#@/utils/server/list-page.ts'
import FavoritesPage from '../library/favorites/page.tsx'

export function loader() {
  return loadFavoritesPage()
}

export default function LibraryFavoritesRoute() {
  return <FavoritesPage />
}
