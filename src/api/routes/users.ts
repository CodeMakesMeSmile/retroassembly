import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createUser } from '#@/controllers/users/create-user.ts'
import { deleteUser } from '#@/controllers/users/delete-user.ts'
import { getAllUsers } from '#@/controllers/users/get-all-users.ts'
import { getCurrentUser } from '#@/controllers/users/get-current-user.ts'
import { updateUser } from '#@/controllers/users/update-user.ts'
import { requireUser } from '#@/middlewares/require-user.ts'

export const users = new Hono()
  // Whoever is signed in, or null; open to everyone
  .get('current', async (c) => {
    const user = await getCurrentUser()
    return c.json(user)
  })

  // Everything else is for signed-in users, and most of it for the admin only
  .use(requireUser())

  .get('', async (c) => {
    const users = await getAllUsers(c.var.scope)
    return c.json(users)
  })

  .post(
    '',
    zValidator(
      'form',
      z.object({
        libraryMode: z.coerce.number().optional().default(0),
        password: z.string().optional(),
        username: z.string(),
      }),
    ),
    async (c) => {
      const form = c.req.valid('form')
      const user = await createUser({ ...form, requireSuperUser: true })
      return c.json(user)
    },
  )

  .patch(
    ':id',
    zValidator(
      'form',
      z.object({
        libraryMode: z.coerce.number(),
      }),
    ),
    async (c) => {
      const form = c.req.valid('form')
      const user = await updateUser(c.var.scope, { id: c.req.param('id'), libraryMode: form.libraryMode })
      return c.json(user)
    },
  )

  .delete(':id', async (c) => {
    await deleteUser(c.var.scope, c.req.param('id'))
    return c.json({ success: true })
  })
