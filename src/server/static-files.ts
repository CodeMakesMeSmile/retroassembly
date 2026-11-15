import { stat } from 'node:fs/promises'
import path from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import type { MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'

// Built files named after a fingerprint of their contents (/assets/name-hash.ext) never change, so browsers can keep
// them for good. Files at a fixed address (the favicon, the manifest, artwork) can change in a new build, so browsers
// keep them but check each time
const fingerprintedPath = /^\/assets\/[^/]+-[\w-]{8}\.\w+$/u

// Answers a check for an unchanged fixed-address file with 304, which the static file handler doesn't do itself
function notModified(staticRoot: string) {
  return createMiddleware(async (c, next) => {
    const since = Date.parse(c.req.header('If-Modified-Since') ?? '')
    if (c.req.method !== 'GET' || Number.isNaN(since) || fingerprintedPath.test(c.req.path)) {
      return next()
    }
    const filePath = path.join(staticRoot, decodeURIComponent(c.req.path))
    if (!filePath.startsWith(`${staticRoot}${path.sep}`)) {
      return next()
    }
    let stats: Awaited<ReturnType<typeof stat>> | undefined
    try {
      stats = await stat(filePath)
    } catch {
      return next()
    }
    // Last-Modified is sent in whole seconds
    if (stats.isFile() && Math.floor(stats.mtimeMs / 1000) * 1000 <= since) {
      return c.body(null, 304, { 'Cache-Control': 'no-cache', 'Last-Modified': stats.mtime.toUTCString() })
    }
    return next()
  })
}

/** Serves the built client files from `root`, with the caching rules above. */
export function staticFiles(root: string): MiddlewareHandler[] {
  const staticRoot = path.resolve(root)
  const serve = serveStatic({
    // Not one of the build's files: the rest of the app answers it, with its own caching
    onNotFound: (_path, c) => {
      c.header('Cache-Control', undefined)
    },
    precompressed: true,
    root: staticRoot,
  })
  // Set before the file is sent, since headers added once it's on its way are lost
  function withCaching(...[c, next]: Parameters<MiddlewareHandler>) {
    c.header('Cache-Control', fingerprintedPath.test(c.req.path) ? 'public, immutable, max-age=31536000' : 'no-cache')
    return serve(c, next)
  }
  return [notModified(staticRoot), withCaching]
}
