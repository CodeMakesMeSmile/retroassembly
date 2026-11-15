import assert from 'node:assert'
import { defaultRedirectTo, type AuthMode } from '#@/constants/auth.ts'
import { getRunTimeEnv } from '#@/constants/env.ts'

export function getAuthMode(): AuthMode {
  return resolveAuthMode(getRunTimeEnv())
}

export function resolveAuthMode(env: Record<string, unknown>): AuthMode {
  const oidcValues = [
    env.RETROASSEMBLY_RUN_TIME_OIDC_ISSUER,
    env.RETROASSEMBLY_RUN_TIME_OIDC_CLIENT_ID,
    env.RETROASSEMBLY_RUN_TIME_OIDC_CLIENT_SECRET,
  ]
  const hasOidcConfiguration = oidcValues.some(Boolean)

  if (hasOidcConfiguration) {
    assert.ok(oidcValues.every(Boolean), 'OIDC issuer, client ID, and client secret must all be set')
    return 'oidc'
  }

  return 'local'
}

export function getSafeRedirectTo(value: null | string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return defaultRedirectTo
  }
  const baseUrl = new URL('https://retroassembly.invalid')
  const redirectUrl = new URL(value, baseUrl)
  if (redirectUrl.origin !== baseUrl.origin || redirectUrl.pathname.startsWith('//')) {
    return defaultRedirectTo
  }
  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
}
