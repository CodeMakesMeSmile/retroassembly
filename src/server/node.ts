import { serve } from '@hono/node-server'
import { RouterContextProvider, createRequestHandler } from 'react-router'
import { getAuthMode } from '#@/utils/server/auth.ts'
import { startCDNCachePrefetch } from '#@/utils/server/cdn-prefetch.ts'
import { compressPspGames } from '#@/utils/server/compress-psp-games.ts'
import { initializeDatabase } from '#@/utils/server/migration/initalization.ts'
import { backfillRawMetadata } from '#@/utils/server/migration/raw-metadata.ts'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore we can not guarantee that this file exists
import * as build from '../../dist/server/index.js'
import { createServer } from './create-server.ts'

interface BootOptions {
  hostname: string
  onListening: (port: number) => void
  port: number
}

function runInBackground(name: string, job: () => unknown) {
  setImmediate(async () => {
    try {
      await job()
    } catch (error) {
      console.warn(`${name} failed`, error)
    }
  })
}

/**
 * Starts the app: checks the settings and brings the database up to date, then listens. Jobs that need the internet
 * (filling in game info, downloading emulator files for offline use) start only after that, so the library is up
 * quickly even when the internet isn't.
 */
export async function boot({ hostname, onListening, port }: BootOptions) {
  getAuthMode()
  await initializeDatabase()

  const requestHandler = createRequestHandler(build, 'production')
  const app = createServer({
    client: { root: 'dist/client', version: String(build.assets.version) },
    pages: (c) => requestHandler(c.req.raw, new RouterContextProvider()),
  })
  serve({ fetch: app.fetch, hostname, port }, (info) => onListening(info.port))

  runInBackground('Filling in game info', backfillRawMetadata)
  runInBackground('Downloading CDN files', startCDNCachePrefetch)
  runInBackground('Compressing PSP games', compressPspGames)
}
