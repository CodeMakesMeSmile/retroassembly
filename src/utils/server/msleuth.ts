import { attemptAsync, compact } from 'es-toolkit'
import type { msleuth as client, IdentifyParameter, QueryParameter } from 'msleuth/client'
import QuickLRU from 'quick-lru'
import { getRunTimeEnv } from '#@/constants/env.ts'

// Loaded when first needed, since it ships as TypeScript that only the bundler can load
async function createClients() {
  const { createClient } = await import('msleuth/client')
  const runTimeEnv = getRunTimeEnv()
  const hosts = compact([
    runTimeEnv.RETROASSEMBLY_RUN_TIME_MSLEUTH_HOST,
    ...runTimeEnv.RETROASSEMBLY_RUN_TIME_MSLEUTH_FALLBACK_HOST.split(','),
  ])
  const clients = hosts.map((host) => createClient(host))

  return clients
}

const queryCache = new QuickLRU<string, Awaited<ReturnType<typeof client.query>>>({ maxSize: 100 })
async function query(json: QueryParameter) {
  const cacheKey = JSON.stringify(json)
  if (queryCache.has(cacheKey)) {
    return queryCache.get(cacheKey)
  }

  for (const client of await createClients()) {
    const [, result] = await attemptAsync(() => client.query(json))
    if (result) {
      return result
    }
  }
}

async function identify(json: IdentifyParameter) {
  for (const client of await createClients()) {
    const [, result] = await attemptAsync(() => client.identify(json))
    if (result) {
      return result
    }
  }
}

export const msleuth = { identify, query }
