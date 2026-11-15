import { createMiddleware } from 'hono/factory'
import { getDatabase } from '#@/utils/server/drizzle.ts'
import { createStorage } from '#@/utils/server/storage.ts'

declare module 'hono' {
  interface ContextVariableMap {
    db: ReturnType<typeof getDatabase>
    storage: ReturnType<typeof createStorage>
  }
}

export function vendors() {
  return createMiddleware(async (c, next) => {
    c.set('db', getDatabase())
    c.set('storage', createStorage())
    await next()
  })
}
