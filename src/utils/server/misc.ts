import { getConnInfo as getNodeConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import { getContext } from 'hono/context-storage'
import { z } from 'zod'
import { getDefaultRomsDirection, getListOrder } from '#@/constants/roms-order.ts'

export function getConnInfo(context?: Context) {
  const c = context || getContext()
  try {
    return getNodeConnInfo(c)
  } catch {}
}

export async function getFileContent(id: string, options?: { range?: { length?: number; offset: number } }) {
  const { storage } = getContext().var

  const object = await storage.get(id, options)
  return object
}

export function getRomsQuery() {
  const c = getContext()
  const { searchParams } = new URL(c.req.url)
  const direction = searchParams.get('direction')
  const favorite = searchParams.get('favorite')
  // What's typed in the list's search box, if anything
  const search = searchParams.get('q')?.trim().replaceAll(/\s+/gu, ' ').slice(0, 100) || undefined
  const order = getListOrder(searchParams.get('sort'), Boolean(search))

  return {
    /* eslint-disable promise/prefer-await-to-then */
    direction: z.enum(['asc', 'desc']).catch(getDefaultRomsDirection(order)).parse(direction),
    favorite: favorite === '1',
    orderBy: order,
    page: z.coerce.number().min(1).catch(1).parse(searchParams.get('page')),
    /* eslint-enable promise/prefer-await-to-then */
    search,
  }
}
