import { clsx } from 'clsx'
import { type CSSProperties, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import type { RetroPadButton } from '#@/input/retropad.ts'
import { useSession } from '#@/pages/library/components/emulator-portal/emulator-session-provider.tsx'
import { useControlsScale } from '#@/pages/library/hooks/use-controls-scale.ts'
import { DPad } from './dpad.tsx'
import { pressed } from './psx-controls.tsx'
import { Thumbstick } from './thumbstick.tsx'
import { VirtualGamepadButton } from './virtual-gamepad-button.tsx'

// The PSP's controls, drawn like the PSP itself: the d-pad every console shares with the analog nub below it, and the
// four face buttons in their diamond, black and slightly glossy with thin symbols in the PlayStation's colours. L and R
// are square shoulder buttons in the same black above them, rounded at the outer corner as on the PSP. Select and Start
// sit in the top bar beside pause, in its style, so they stay out of the way. PPSSPP reads the buttons as PCSX ReARMed
// does, and the nub from the left stick

// Each symbol, drawn as a shape so all four come out the same size and weight
const symbols = {
  circle: <circle cx='12' cy='12' fill='none' r='8.5' stroke='currentColor' strokeWidth='2.6' />,
  cross: (
    <path d='M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5' stroke='currentColor' strokeLinecap='round' strokeWidth='2.6' />
  ),
  square: <rect fill='none' height='16' rx='1.5' stroke='currentColor' strokeWidth='2.6' width='16' x='4' y='4' />,
  triangle: <path d='M12 3.5 21 19.5H3Z' fill='none' stroke='currentColor' strokeLinejoin='round' strokeWidth='2.6' />,
}

// Each face button: its name, symbol and colour, and its place in the diamond in portrait and in landscape
const faceButtons: [
  label: string,
  buttonName: RetroPadButton,
  symbol: keyof typeof symbols,
  color: string,
  className: string,
][] = [
  [
    'Triangle',
    'x',
    'triangle',
    '#3fcf8e',
    'right-[64px] bottom-[307px] landscape:right-[48px] landscape:bottom-[251px]',
  ],
  ['Square', 'y', 'square', '#e88ac8', 'right-[112px] bottom-[259px] landscape:right-[86px] landscape:bottom-[213px]'],
  ['Circle', 'a', 'circle', '#ff5a5a', 'right-[16px] bottom-[259px] landscape:right-[10px] landscape:bottom-[213px]'],
  ['Cross', 'b', 'cross', '#7aa8ff', 'right-[64px] bottom-[211px] landscape:right-[48px] landscape:bottom-[175px]'],
]

const black: CSSProperties = {
  background: 'radial-gradient(circle at 38% 30%, #3c3c42, #1d1d21 62%, #0f0f12)',
  boxShadow: '0 2px 3px #000c, inset 0 1px 0 #ffffff26',
}

// L and R: as wide as the d-pad, above the d-pad and the face buttons
const shoulder = twMerge(
  pressed,
  'absolute bottom-[366px] grid h-12 w-34 place-items-center text-sm font-extrabold text-[#c8c8ce]',
  'landscape:bottom-[296px] landscape:h-10 landscape:w-27.5 landscape:text-xs',
)

// Select and Start in the top bar: like pause beside them, a label with no background that lights up while pressed
const topBarButton =
  'rounded p-2 text-[10px] font-semibold tracking-wider text-white/75 data-[touching=true]:bg-white/25'

// The top bar with pause, Select and Start
const topBarHeight = 44

/**
 * Sideways, the game's picture goes below the top bar instead of under it. At the PSP's wide shape that also narrows it,
 * which leaves the controls at the sides clear of it too. Only the canvas's CSS top and height are set: RetroArch sizes
 * the picture from them, and is told by a resize event
 */
function useFitGameBelowTopBar(enabled: boolean) {
  const { emulator } = useSession()

  useEffect(() => {
    const canvas = emulator?.getCanvas()
    if (!enabled || !canvas) {
      return
    }
    function fit() {
      if (!canvas) {
        return
      }
      const landscape = globalThis.matchMedia('(orientation: landscape)').matches
      const viewportHeight = globalThis.visualViewport?.height ?? globalThis.innerHeight
      const top = landscape ? `${topBarHeight}px` : '0px'
      const height = landscape ? `${Math.floor(viewportHeight - topBarHeight)}px` : '100%'
      // Set again only when they differ, since setting them is itself watched below
      if (canvas.style.top !== top || canvas.style.height !== height) {
        canvas.style.top = top
        canvas.style.height = height
        globalThis.dispatchEvent(new Event('resize'))
      }
    }
    fit()
    const abortController = new AbortController()
    globalThis.addEventListener('resize', fit, { signal: abortController.signal })
    globalThis.visualViewport?.addEventListener('resize', fit, { signal: abortController.signal })
    // The emulator puts its own full-screen style back when it starts, after this has run
    const styleObserver = new MutationObserver(fit)
    styleObserver.observe(canvas, { attributeFilter: ['style'] })
    return () => {
      abortController.abort()
      styleObserver.disconnect()
      canvas.style.top = '0'
      canvas.style.height = '100%'
      globalThis.dispatchEvent(new Event('resize'))
    }
  }, [enabled, emulator])
}

export function PspControls({ visible }: Readonly<{ visible: boolean }>) {
  const hidden = clsx({ hidden: !visible })
  const { launched } = useSession()
  useFitGameBelowTopBar(launched && visible)
  // Each side's controls are about 150 points wide, and 450 tall in portrait; they shrink on smaller screens. Sideways
  // the game starts below the top bar, which leaves them more room beside it
  const scale = useControlsScale(150, 480 / 272, 450, topBarHeight)
  // In landscape each side is centred in the height below the top bar; its tallest part, L or R, tops out at 336 points
  const side = { '--controls-height': `${336 * scale}px`, scale } as CSSProperties

  return (
    <>
      <div
        className={twMerge('bottom-safe left-safe controls-centred absolute size-0 origin-top-left', hidden)}
        style={side}
      >
        <VirtualGamepadButton
          buttonName='l'
          className={twMerge(shoulder, 'left-5 rounded-tl-2xl rounded-tr-md rounded-b-md landscape:left-4')}
          style={black}
        >
          L
        </VirtualGamepadButton>
        <DPad className='absolute bottom-[214px] left-5 size-34 landscape:bottom-[176px] landscape:left-4 landscape:size-27.5' />
        <Thumbstick
          className='absolute bottom-17 left-16 size-30 landscape:bottom-14 landscape:left-10 landscape:size-26'
          stick='left'
        />
      </div>

      <div
        className={twMerge('bottom-safe right-safe controls-centred absolute size-0 origin-top-left', hidden)}
        style={side}
      >
        <VirtualGamepadButton
          buttonName='r'
          className={twMerge(shoulder, 'right-4 rounded-tl-md rounded-tr-2xl rounded-b-md landscape:right-3')}
          style={black}
        >
          R
        </VirtualGamepadButton>
        {faceButtons.map(([label, buttonName, symbol, color, className]) => (
          <VirtualGamepadButton
            buttonName={buttonName}
            className={twMerge(
              pressed,
              'absolute grid size-11.5 place-items-center rounded-full landscape:size-9',
              className,
            )}
            group='face'
            key={label}
            style={{ ...black, color }}
            title={label}
          >
            <svg aria-hidden className='size-5 landscape:size-4' viewBox='0 0 24 24'>
              {symbols[symbol]}
            </svg>
          </VirtualGamepadButton>
        ))}
      </div>

      {/* Select and Start: in the top bar, beside pause */}
      <div className={twMerge('top-safe left-safe-offset-10 absolute flex', hidden)}>
        <VirtualGamepadButton buttonName='select' className={topBarButton} title='Select'>
          SELECT
        </VirtualGamepadButton>
        <VirtualGamepadButton buttonName='start' className={topBarButton} title='Start'>
          START
        </VirtualGamepadButton>
      </div>
    </>
  )
}
