import scrollIntoView from 'smooth-scroll-into-view-if-needed'
import SpatialNavigation, { type Direction } from 'spatial-navigation-ts'

/**
 * What the arrow keys and a gamepad move between: every link, button and box on the page, so nothing that can be clicked
 * is out of their reach, except what's marked `data-sn-skip` (each game's heart and menu in a list, which its own page
 * has, so a grid takes one press a game) and what's hidden, such as the unseen box behind each checkbox
 */
export const navigableSelector =
  ':is(a[href], button, input:not([type="hidden"]), select, textarea, [role="combobox"], [tabindex]:not([tabindex="-1"]), [data-sn-enabled]):not([data-sn-skip], [disabled], [aria-hidden="true"])'

/** A box made focusable only to hold controls, such as a group of checkboxes, is passed over for the controls in it */
function holdsControls(element: HTMLElement) {
  return !element.matches('a, button, input, select, textarea') && Boolean(element.querySelector(navigableSelector))
}

export function isNavigable(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement && element.matches(navigableSelector) && !holdsControls(element)
}

function isFocusable(element: unknown): element is HTMLElement {
  const focusableElements = [
    HTMLAnchorElement,
    HTMLButtonElement,
    HTMLInputElement,
    HTMLSelectElement,
    HTMLTextAreaElement,
  ]
  const focusable =
    focusableElements.some((clazz) => element instanceof clazz) ||
    (element instanceof HTMLElement && element.getAttribute('tabindex'))
  if (!focusable || !(element instanceof HTMLElement) || !element.isConnected) {
    return false
  }
  if ('disabled' in element && element.disabled) {
    return false
  }
  return true
}

export function click(element: unknown) {
  const focusable = isFocusable(element)
  if (focusable) {
    element.click()
  }
}

export function focus(element: unknown) {
  if (typeof element === 'string') {
    focus(document.body.querySelector(element))
    return
  }
  if (element === document.activeElement) {
    return
  }
  const focusable = isFocusable(element)
  if (focusable) {
    element.focus({ preventScroll: true })
  }
}

const dialogSelector = '[role="dialog"], [role="alertdialog"]'

/** The dialog on top, such as Settings, when one is open */
function openDialog() {
  return [...document.querySelectorAll<HTMLElement>(dialogSelector)].at(-1)
}

/** Whether a dialog is open with the focus in it (or nowhere): the keys then move in the dialog, and back closes it */
export function isInDialog() {
  const { activeElement } = document
  if (activeElement instanceof HTMLElement && activeElement.closest(dialogSelector)) {
    return true
  }
  return Boolean(openDialog()) && (!activeElement || activeElement === document.body)
}

/** Whether the focus is in an open menu or list, such as Sort's, which moves with its own keys */
export function isInMenu() {
  const { activeElement } = document
  return (
    activeElement instanceof HTMLElement &&
    Boolean(activeElement.closest('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'))
  )
}

/** Sends a key to the open menu, as if it were pressed: how a gamepad, or a remapped key, works a menu */
export function pressInMenu(key: string) {
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

/**
 * Whether the arrow keys on this control are for moving around, rather than for the control itself. Controls that take
 * the arrows (a menu button opens its menu, a group of checkboxes, tabs or options steps through them in reading order)
 * don't get them, so up is always up; a slider keeps left and right, to change it
 */
export function isArrowForMoving(element: unknown, key: string) {
  if (!(element instanceof HTMLElement) || isInMenu() || element.closest('.game-overlay')) {
    return false
  }
  if (!element.closest(`.library-layout, ${dialogSelector}`)) {
    return false
  }
  const sideways = key === 'ArrowLeft' || key === 'ArrowRight'
  return !(sideways && element.matches('[role="slider"], [data-sn-adjust]'))
}

type CancelHandler = () => void
let cancelHandler: CancelHandler | undefined
export function onCancel(handler: CancelHandler) {
  cancelHandler = handler
}
export function offCancel() {
  cancelHandler = undefined
}
export function cancel() {
  try {
    if (cancelHandler) {
      cancelHandler()
    } else {
      globalThis.history.back()
    }
  } catch {}
}

function inSidebar(element: unknown) {
  return element instanceof HTMLElement && Boolean(element.closest('aside'))
}

/** Where a left or right move starts from, while it's looking for where to go */
let sidewaysFrom: HTMLElement | undefined

/**
 * Left and right go only to something beside you, in the same row: at the end of a row the focus stays there, rather
 * than jumping to the row above or its "See all". Going between the page and the sidebar is the exception
 */
function isBeside(element: HTMLElement) {
  if (!sidewaysFrom || inSidebar(sidewaysFrom) !== inSidebar(element)) {
    return true
  }
  const from = sidewaysFrom.getBoundingClientRect()
  const to = element.getBoundingClientRect()
  return to.bottom > from.top + 1 && to.top < from.bottom - 1
}

let moving = false
export function move(direction?: Direction) {
  if (moving || !direction) {
    return
  }
  // With nothing chosen yet, the first press only shows where you are, on the first thing on the page
  const before = document.activeElement
  resetFocus()
  if (!document.activeElement || document.activeElement !== before) {
    return
  }
  const currentActiveElement = document.activeElement
  // A control that left and right change, such as the volume, is told which way instead of losing the focus
  if (
    (direction === 'left' || direction === 'right') &&
    currentActiveElement instanceof HTMLElement &&
    currentActiveElement.dataset.snAdjust !== undefined
  ) {
    currentActiveElement.dispatchEvent(new CustomEvent('sn:adjust', { detail: direction }))
    return
  }
  const vertical = direction === 'up' || direction === 'down'
  return new Promise<void>((resolve) => {
    const abortController = new AbortController()
    async function handleWillFocus(event: Event) {
      moving = true
      focus(currentActiveElement)
      const nextActiveElement = event.target
      event.preventDefault()
      // Up and down from the sidebar stay in it; left and right go to the page
      if (vertical && inSidebar(currentActiveElement) && !inSidebar(nextActiveElement)) {
        moving = false
        abortController.abort()
        resolve()
        return
      }
      if (nextActiveElement instanceof HTMLElement) {
        await scrollIntoView(nextActiveElement, {
          block: 'center',
          duration: 300,
          scrollMode: 'if-needed',
          // Only what really scrolls: a clipped box, like Home's banner behind its art, would otherwise be nudged
          skipOverflowHiddenElements: true,
        })
      }
      focus(nextActiveElement)
      moving = false
      abortController.abort()
      resolve()
    }
    document.body.addEventListener('sn:willfocus', handleWillFocus, { capture: true, signal: abortController.signal })
    // Up and down from the page look only in the page: past its end isn't the sidebar's Settings
    document.documentElement.classList.toggle('sn-in-page', vertical && !inSidebar(currentActiveElement))
    sidewaysFrom = vertical || !(currentActiveElement instanceof HTMLElement) ? undefined : currentActiveElement
    SpatialNavigation.move(direction)
    sidewaysFrom = undefined
    document.documentElement.classList.remove('sn-in-page')
  })
}

export function resetFocus({ force }: { force?: boolean } = {}) {
  // In a dialog, its first control
  const dialog = openDialog()
  if (dialog) {
    if (!isNavigable(document.activeElement) || !dialog.contains(document.activeElement)) {
      focus([...dialog.querySelectorAll(navigableSelector)].find((element) => isNavigable(element)))
    }
    return
  }
  if (!isNavigable(document.activeElement) || force) {
    // The first thing on the page to go to: Continue or Start where there's a game to play, then the first game in a
    // list, then anything in the page, such as the first console on the Consoles page, then where you are in the sidebar
    const selectors = ['.launch-button', '.game-entry', `main ${navigableSelector}`, '.sidebar-link.active']
    for (const selector of selectors) {
      const element = [...document.querySelectorAll(selector)].find((candidate) => isNavigable(candidate))
      if (element) {
        focus(element)
        return
      }
    }
  }
}

export function init() {
  SpatialNavigation.set({ navigableFilter: (element: HTMLElement) => !holdsControls(element) && isBeside(element) })

  SpatialNavigation.add({
    restrict: 'self-only',
    // the sidebar is left out while moving up or down in the page (see move)
    selector: `.library-layout ${navigableSelector}:not(html.sn-in-page aside *)`,
  })

  SpatialNavigation.add({
    restrict: 'self-only',
    selector: '.game-overlay [data-sn-enabled]',
  })

  // a dialog, such as Settings: the keys move only in it
  SpatialNavigation.add({
    restrict: 'self-only',
    selector: `:is(${dialogSelector}) ${navigableSelector}`,
  })

  // game-overlay
  resetFocus()
}
