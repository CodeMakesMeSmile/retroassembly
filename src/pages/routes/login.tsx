import { getContext } from 'hono/context-storage'
import { countUsers } from '#@/controllers/users/count-users.ts'
import { getAuthMode, getSafeRedirectTo } from '#@/utils/server/auth.ts'
import { LoginPage } from '../login/page.tsx'
import type { Route } from './+types/login.ts'

export async function loader({ request }: Route.LoaderArgs) {
  const c = getContext()
  const { currentUser, t } = c.var
  const { searchParams } = new URL(request.url)
  const redirectTo = getSafeRedirectTo(searchParams.get('redirect_to'))

  if (currentUser) {
    throw c.redirect(redirectTo)
  }

  const authMode = getAuthMode()
  if (authMode === 'oidc') {
    const errorCode = searchParams.get('error')
    const error = errorCode ? { message: t(`auth.${errorCode}`) } : undefined
    return { error, formType: 'oidc' as const, redirectTo, title: t('auth.login') }
  }

  const userCount = await countUsers()
  const formType = userCount ? 'login' : 'register'
  return { formType, redirectTo, title: t('auth.login') }
}

export default function LoginRoute() {
  return <LoginPage />
}
