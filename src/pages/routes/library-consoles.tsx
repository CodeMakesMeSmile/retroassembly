import { getContext } from 'hono/context-storage'
import { getLibraryOverview } from '#@/controllers/roms/get-home-picks.ts'
import { getLibraryScope } from '#@/utils/server/library-scope.ts'
import ConsolesPage from '../library/consoles/page.tsx'

export async function loader() {
  const { consoles, stats } = await getLibraryOverview(getLibraryScope())
  return { consoles, stats, title: getContext().var.t('nav.consoles') }
}

export default function LibraryConsolesRoute() {
  return <ConsolesPage />
}
