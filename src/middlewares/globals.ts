import { asc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { accepts } from 'hono/accepts'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { match } from 'path-to-regexp'
import type { ResolvedPreference } from '#@/constants/preference.ts'
import { getPreference } from '#@/controllers/preference/get-preference.ts'
import { getCurrentUser } from '#@/controllers/users/get-current-user.ts'
import { libraryModeEnum, statusEnum, userTable } from '#@/databases/schema.ts'
import { locales } from '#@/locales/locales.ts'
import { defaultLanguage, i18n } from '#@/utils/isomorphic/i18n.ts'

declare module 'hono' {
  interface ContextVariableMap {
    authorized: boolean
    currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
    detectedLanguage: string
    effectiveLibraryUserId: string
    language: string
    preference: ResolvedPreference
    t: ReturnType<typeof i18n.getFixedT>
    token: string
    unauthorized: boolean
  }
}

const supportLanguages = locales.map(({ code }) => code)

function getDetectedLanguage(c: Context) {
  return accepts(c, {
    default: defaultLanguage,
    header: 'Accept-Language',
    supports: supportLanguages,
  })
}

function getLanguage(c: Context) {
  const { detectedLanguage, preference } = c.var

  const path = c.req.path.endsWith('.data') ? c.req.path.slice(0, -5) : c.req.path
  const isLibrary = match('/library{/*path}')(path)

  let language = detectedLanguage
  if (isLibrary) {
    language =
      !preference?.ui?.language || preference?.ui?.language === 'auto' ? detectedLanguage : preference?.ui?.language
  }

  if (!supportLanguages.includes(language)) {
    language = defaultLanguage
  }

  return language
}

export function globals() {
  return createMiddleware(async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '') || getCookie(c, 'token') || ''
    c.set('token', token)

    const currentUser = await getCurrentUser()
    c.set('authorized', Boolean(currentUser))
    c.set('unauthorized', !currentUser)
    if (currentUser) {
      c.set('currentUser', currentUser)

      // Compute effective library user ID
      let effectiveLibraryUserId = currentUser.id
      if (currentUser.libraryMode === libraryModeEnum.shared) {
        const [superUser] = await c.var.db.library
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.status, statusEnum.normal))
          .orderBy(asc(userTable.createdAt))
          .limit(1)
        if (superUser && superUser.id !== currentUser.id) {
          effectiveLibraryUserId = superUser.id
        }
      }
      c.set('effectiveLibraryUserId', effectiveLibraryUserId)

      const preference = await getPreference()
      c.set('preference', preference)
    }

    c.set('detectedLanguage', getDetectedLanguage(c))

    const language = getLanguage(c)
    c.set('language', language)
    // Each request gets its own translations, so requests in different languages can't swap them mid-way
    c.set('t', i18n.getFixedT(language))

    await next()
  })
}
