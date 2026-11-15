import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { contextStorage } from 'hono/context-storage'
import { app as api } from '#@/api/app.ts'
import { auth } from '#@/middlewares/auth.ts'
import { cdnCache } from '#@/middlewares/cdn-cache.ts'
import { globals } from '#@/middlewares/globals.ts'
import { logger } from '#@/middlewares/logger.ts'
import { vendors } from '#@/middlewares/vendors.ts'

const app = new Hono()
// Compresses text responses made per request, like pages and API data. Static files are served from precompressed
// copies instead. Stored files (games, saves, artwork) and the emulator cache are left alone: they're mostly binary,
// some are labelled as text anyway, and compressing them would drop their size from downloads for no gain
const compressText = compress()
const uncompressedPaths = [/^\/api\/v1\/files\//u, /^\/api\/v1\/roms\/[^/]+\/content$/u, /^\/cdn\//u]
app.use((c, next) => (uncompressedPaths.some((path) => path.test(c.req.path)) ? next() : compressText(c, next)))
app.use(contextStorage())
app.use(vendors(), globals(), auth(), logger())
app.get('/cdn/*', cdnCache())
app.route('', api)
// A private library, kept out of search engines
app.get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /'))

export default app
