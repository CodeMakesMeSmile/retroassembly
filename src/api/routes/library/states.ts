import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { deleteState } from '#@/controllers/states/delete-states.ts'
import { createState } from '../../../controllers/states/create-state.ts'
import { getStates } from '../../../controllers/states/get-states.ts'

export const states = new Hono()

  .get(
    '',

    zValidator(
      'query',
      z.object({
        rom: z.string(),
        type: z.enum(['manual', 'auto']),
      }),
    ),

    async (c) => {
      const query = c.req.valid('query')
      const states = await getStates(c.var.scope, { rom: query.rom, type: query.type })
      return c.json(states)
    },
  )

  .post(
    '',

    zValidator(
      'form',
      z.object({
        core: z.string(),
        rom: z.string(),
        state: z.instanceof(Blob),
        thumbnail: z.instanceof(Blob),
        type: z.enum(['auto', 'manual']),
      }),
    ),

    async (c) => {
      const form = c.req.valid('form')
      const state = await createState(c.var.scope, form)
      return c.json(state)
    },
  )

  .delete(':id', async (c) => {
    const { id } = c.req.param()
    await deleteState(c.var.scope, id)
    return c.json(null)
  })
