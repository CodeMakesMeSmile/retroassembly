import { loadHistoryPage } from '#@/utils/server/list-page.ts'
import HistoryPage from '../library/history/page.tsx'

export function loader() {
  return loadHistoryPage()
}

export default function LibraryHistoryRoute() {
  return <HistoryPage />
}
