import { getContext } from 'hono/context-storage'
import { deleteCookie } from 'hono/cookie'
import { invalidateSession } from '#@/controllers/sessions/invalidate-session.ts'

export async function loader() {
  const c = getContext()

  const { token } = c.var

  if (token) {
    await invalidateSession()
    deleteCookie(c, 'token')
  }

  return c.redirect('/')
}

export { noop as default } from 'es-toolkit'
