import { useEffect, useRef } from 'react'
import { type BlockerFunction, useBlocker, useLocation } from 'react-router'
import { needsCrossOriginIsolation } from '#@/utils/isomorphic/cross-origin-isolation.ts'

// Whether this page was loaded with cross-origin isolation. It can't change without loading a page in full
const documentIsolated = typeof location === 'undefined' ? false : needsCrossOriginIsolation(location.pathname)

/**
 * Moving between an isolated game page (the PSP's) and any other page loads the new page in full, so it gets the
 * headers it needs or drops the ones it doesn't. Links, searches, the gamepad and Back all go through here
 */
export function useCrossOriginIsolatedNavigation() {
  const action = useRef<string>('')
  const reloadAfterPop = useRef(false)
  const location = useLocation()

  function shouldBlock({ historyAction, nextLocation }: Parameters<BlockerFunction>[0]) {
    const crosses = needsCrossOriginIsolation(nextLocation.pathname) !== documentIsolated
    if (crosses) {
      action.current = historyAction
    }
    return crosses
  }
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    const { hash, pathname, search } = blocker.location
    const url = `${pathname}${search}${hash}`
    if (action.current === 'POP') {
      // Back and Forward have already moved through the history; the page there is loaded once it's reached
      reloadAfterPop.current = true
      blocker.proceed()
    } else if (action.current === 'REPLACE') {
      globalThis.location.replace(url)
    } else {
      globalThis.location.assign(url)
    }
  }, [blocker])

  // After every render, so it runs once Back or Forward has reached the page
  useEffect(() => {
    if (reloadAfterPop.current && globalThis.location.pathname === location.pathname) {
      reloadAfterPop.current = false
      globalThis.location.reload()
    }
  })
}
