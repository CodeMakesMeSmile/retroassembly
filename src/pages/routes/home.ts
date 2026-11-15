import { getContext } from 'hono/context-storage'

// The library is the app's front page
export function loader() {
  throw getContext().redirect('/library')
}

export { noop as default } from 'es-toolkit'
