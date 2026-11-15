import { loadPlatformPage } from '#@/utils/server/list-page.ts'
import PlatformPage from '../library/platform/page.tsx'
import type { Route } from './+types/library-platform.ts'

export function loader({ params }: Route.LoaderArgs) {
  return loadPlatformPage(params.platform)
}

export default function LibraryPlatformRoute() {
  return <PlatformPage />
}
