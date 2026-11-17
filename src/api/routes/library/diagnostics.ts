import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

// Temporary: what a PSP game page reports about itself (its device, the emulator's messages, errors, frame rate), written
// to the server's log, to find out why PSP games don't run on some phones. Removed once that's solved

export const diagnostics = new Hono().post(
  '',
  zValidator('json', z.object({ lines: z.array(z.string().max(2000)).max(500), session: z.string().max(40) })),
  (c) => {
    const { lines, session } = c.req.valid('json')
    const user = c.var.scope.user.username
    for (const line of lines) {
      console.info(`[diagnostics ${user} ${session}] ${line}`)
    }
    return c.json(null)
  },
)
