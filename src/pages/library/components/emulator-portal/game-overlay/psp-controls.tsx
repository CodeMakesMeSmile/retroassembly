import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useControlsScale } from '#@/pages/library/hooks/use-controls-scale.ts'
import { DPad } from './dpad.tsx'
import { bumper, bumperStyle, faceButtons, faceStyle, plain, plainStyle, pressed } from './psx-controls.tsx'
import { Thumbstick } from './thumbstick.tsx'
import { VirtualGamepadButton } from './virtual-gamepad-button.tsx'

// The PSP's controls, drawn like the PlayStation's: the d-pad every console shares and the four face buttons in their
// diamond, with the PSP's one L and one R shoulder button, its analog nub below the d-pad, and Select and Start between
// the hands in portrait, or beside pause in landscape. PPSSPP reads the buttons as PCSX ReARMed does, and the nub from
// the left stick
export function PspControls({ visible }: Readonly<{ visible: boolean }>) {
  const hidden = clsx({ hidden: !visible })
  // As the PlayStation's, for the PSP's wider screen
  const scale = useControlsScale(150, 480 / 272, 450)

  return (
    <>
      <div className={twMerge('bottom-safe left-safe absolute size-0 origin-top-left', hidden)} style={{ scale }}>
        <VirtualGamepadButton buttonName='l' className={twMerge(bumper, 'left-4 landscape:left-3')} style={bumperStyle}>
          L
        </VirtualGamepadButton>
        <DPad className='absolute bottom-[174px] left-5 size-34 landscape:bottom-[152px] landscape:left-4 landscape:size-27.5' />
        <Thumbstick
          className='absolute bottom-7 left-16 size-30 landscape:bottom-6.5 landscape:left-10 landscape:size-26'
          stick='left'
        />
      </div>

      <div className={twMerge('bottom-safe right-safe absolute size-0 origin-top-left', hidden)} style={{ scale }}>
        <VirtualGamepadButton
          buttonName='r'
          className={twMerge(bumper, 'right-4 landscape:right-3')}
          style={bumperStyle}
        >
          R
        </VirtualGamepadButton>
        {faceButtons.map(([label, buttonName, color, className]) => (
          <VirtualGamepadButton
            buttonName={buttonName}
            className={twMerge(
              pressed,
              'absolute size-11.5 rounded-full text-xl font-bold landscape:size-9 landscape:text-base',
              className,
            )}
            group='face'
            key={label}
            style={{ ...faceStyle, color }}
            title={label}
          >
            {label}
          </VirtualGamepadButton>
        ))}
      </div>

      {/* Select and Start: between the hands in portrait, beside pause in landscape */}
      <div
        className={twMerge(
          'bottom-safe landscape:top-safe landscape:left-safe-offset-11 absolute left-1/2 size-0 origin-top-left landscape:bottom-auto',
          hidden,
        )}
        style={{ scale }}
      >
        <div className='absolute bottom-[420px] left-0 flex -translate-x-1/2 gap-2 landscape:top-3 landscape:bottom-auto landscape:translate-x-0 landscape:gap-1'>
          <VirtualGamepadButton buttonName='select' className={plain} style={plainStyle} title='Select'>
            SELECT
          </VirtualGamepadButton>
          <VirtualGamepadButton buttonName='start' className={plain} style={plainStyle} title='Start'>
            START
          </VirtualGamepadButton>
        </div>
      </div>
    </>
  )
}
