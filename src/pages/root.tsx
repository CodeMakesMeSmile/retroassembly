import '#@/styles/index.ts'
import '#@/utils/client/global.ts'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { getCommonLoaderData } from '#@/utils/server/loader-data.ts'
import type { Route } from './+types/root.ts'
import { AppLayout } from './components/app-layout.tsx'
import { ErrorPage } from './components/error-page.tsx'
import { useReloadOnUpdate } from './hooks/use-reload-on-update.ts'

export function loader() {
  return getCommonLoaderData()
}

export function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppLayout>{children}</AppLayout>
}

export default function App() {
  useReloadOnUpdate()
  return <Outlet />
}

export function ErrorBoundary(props: Readonly<Route.ErrorBoundaryProps>) {
  return <ErrorPage {...props} />
}
