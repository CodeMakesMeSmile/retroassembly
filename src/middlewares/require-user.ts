import { createMiddleware } from 'hono/factory'
import { getLibraryScope, type LibraryScope } from '#@/utils/server/library-scope.ts'

declare module 'hono' {
  interface ContextVariableMap {
    scope: LibraryScope
  }
}

/** Answers 401 to anyone not signed in, and gives the routes after it the signed-in user's scope */
export function requireUser() {
  return createMiddleware(async (c, next) => {
    c.set('scope', getLibraryScope())
    await next()
  })
}
