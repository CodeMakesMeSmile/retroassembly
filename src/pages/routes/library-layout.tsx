import { getContext } from 'hono/context-storage'
import { Outlet, redirect, type ShouldRevalidateFunctionArgs } from 'react-router'
import { defaultRedirectTo } from '#@/constants/auth.ts'
import { getLaunchRecords } from '#@/controllers/launch-records/get-launch-records.ts'
import { getLibraryScope } from '#@/utils/server/library-scope.ts'
import LibraryLayout from '../library/components/library-layout/library-layout.tsx'
import type { Route } from './+types/library-layout.ts'

// Every library page needs a signed-in user. Checked before any page loads its data; a signed-out visitor is sent to
// log in, and back to the page they wanted after
export const middleware: Route.MiddlewareFunction[] = [
  ({ request }) => {
    if (getContext().var.currentUser) {
      return
    }
    const { pathname, search } = new URL(request.url)
    const redirectTo = `${pathname}${search}`
    const loginUrl = new URL('/login', 'http://localhost')
    if (redirectTo !== defaultRedirectTo) {
      loginUrl.searchParams.set('redirect_to', redirectTo)
    }
    throw redirect(`${loginUrl.pathname}${loginUrl.search}`)
  },
]

// What every library page shares: the games played most recently, for the home page and search
export async function loader() {
  const { roms: recentlyLaunchedRoms } = await getLaunchRecords(getLibraryScope(), { pageSize: 20 })
  return { recentlyLaunchedRoms }
}

// Loaded again only when something may have changed it (a change made on the page, or an explicit refresh), not on
// every move between library pages
export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  formMethod,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod || currentUrl.href === nextUrl.href) {
    return defaultShouldRevalidate
  }
  return false
}

export default function LibraryLayoutRoute() {
  return (
    <LibraryLayout>
      <Outlet />
    </LibraryLayout>
  )
}
