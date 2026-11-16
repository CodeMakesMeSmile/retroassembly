import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createGameSave, listGameSaves, restoreGameSave } from '#@/controllers/game-saves/game-saves.ts'

// A game's own save (memory card, battery save): uploaded while it's played or from a file, listed and restored on the
// game's page
export const gameSaves = new Hono()
  .get('', zValidator('query', z.object({ core: z.string(), rom: z.string() })), async (c) => {
    const versions = await listGameSaves(c.var.scope, c.req.valid('query'))
    return c.json(versions)
  })
  .post(':id/restore', async (c) => {
    const restored = await restoreGameSave(c.var.scope, { id: c.req.param('id') })
    return c.json(restored)
  })
  .post(
    '',
    zValidator(
      'form',
      z.object({
        clientId: z.string().min(1).max(64).optional(),
        core: z.string(),
        file: z.instanceof(Blob),
        fileType: z.string().max(8).optional(),
        rom: z.string(),
      }),
    ),
    async (c) => {
      const form = c.req.valid('form')
      const saved = await createGameSave(c.var.scope, form)
      return c.json(saved)
    },
  )
