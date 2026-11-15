import { serve } from '@hono/node-server'
import { logServerInfo } from './utils.ts'

const envPort = process.env.RETROASSEMBLY_RUN_TIME_PORT || process.env.PORT
const port = envPort ? Math.trunc(Number(envPort)) || 8000 : 8000

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore we can not guarantee that this file exists
const { default: app } = await import('../src/server/node.ts')
const hostname = '0.0.0.0'
serve({ ...app, hostname, port }, (info) => {
  logServerInfo(hostname, info.port)
})
