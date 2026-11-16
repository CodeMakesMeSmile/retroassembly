import { Atropos } from 'atropos/react'
import { clsx } from 'clsx'
import { type ReactNode, useEffect, useRef, useState } from 'react'

interface TiltCoverProps {
  children: ReactNode
  className?: string
  innerClassName?: string
}

// How long Atropos takes to settle a cover back after the pointer leaves, plus a little
const settleMs = 400

/**
 * A cover that tilts in 3D under the pointer. It's drawn flat until pointed at, and again once it has settled back:
 * browsers draw 3D layers in tiles, and Firefox left thin lines across covers where the tiles meet
 */
export function TiltCover({ children, className, innerClassName }: Readonly<TiltCoverProps>) {
  const [tilting, setTilting] = useState(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(settleTimer.current), [])

  function handleEnter() {
    clearTimeout(settleTimer.current)
    setTilting(true)
  }

  function handleLeave() {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => setTilting(false), settleMs)
  }

  return (
    <Atropos
      activeOffset={0}
      // A data attribute rather than a class: the wrapper sets the class itself, which would drop Atropos's own
      className={clsx('atropos-flat-at-rest', className)}
      data-tilting={tilting || undefined}
      highlight={false}
      innerClassName={innerClassName}
      onEnter={handleEnter}
      onLeave={handleLeave}
      shadow={false}
    >
      {children}
    </Atropos>
  )
}
