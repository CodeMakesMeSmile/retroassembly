import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createGameSave } from '#@/controllers/game-saves/game-saves.ts'

// A game's own save (memory card, battery save), uploaded while it's played
export const gameSaves = new Hono().post(
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
