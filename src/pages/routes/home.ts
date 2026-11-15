import { getContext } from 'hono/context-storage'
import { routes } from '../routes.ts'

// The library is the app's front page
export function loader() {
  throw getContext().redirect(routes.libraryHome)
}

export { noop as default } from 'es-toolkit'
