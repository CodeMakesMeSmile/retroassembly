import { emulators } from '#@/consoles/emulators.ts'
import { consoles } from '#@/consoles/registry.ts'
import type { EmulatorDefinition } from '#@/consoles/types.ts'

// Emulators that run on several threads (the PSP's) can only start on a page sent with cross-origin isolation headers.
// Only those consoles' game pages are sent with them, so the rest of the site, YouTube videos included, is unchanged.
// A page is isolated or not from when it loads, so moving between an isolated page and any other loads the new page in
// full

const threadedConsoles = new Set(
  Object.entries(consoles)
    .filter(([, { cores }]) =>
      cores.some((core) => (emulators[core] as EmulatorDefinition | undefined)?.launch?.threads),
    )
    .map(([name]) => name),
)

const gamePage = /^\/library\/platform\/(?<platform>[^/]+)\/rom\/[^/]/u

/** Whether the page at `pathname` is a game page that's sent with cross-origin isolation headers */
export function needsCrossOriginIsolation(pathname: string) {
  const platform = gamePage.exec(pathname)?.groups?.platform
  return platform ? threadedConsoles.has(decodeURIComponent(platform)) : false
}

/** The headers that isolate a page: the strict kind, the only kind every browser supports, Safari included */
export const crossOriginIsolationHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
} as const
