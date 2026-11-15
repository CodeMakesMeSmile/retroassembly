import { RouterContextProvider, createRequestHandler } from 'react-router'
import { getAuthMode } from '#@/utils/server/auth.ts'
import { createServer } from './create-server.ts'

getAuthMode()

export default createServer({
  async pages(c) {
    const build = await import('virtual:react-router/server-build')
    const requestHandler = createRequestHandler(build, 'development')
    return requestHandler(c.req.raw, new RouterContextProvider())
  },
})
