import { loadGamesPage } from '#@/utils/server/list-page.ts'
import LibraryROMsPage from '../library/roms/page.tsx'

export function loader() {
  return loadGamesPage()
}

export default function LibraryRoute() {
  return <LibraryROMsPage />
}
