import { attemptAsync, delay, noop } from 'es-toolkit'
import NoSleep from 'nosleep.js'
import { Nostalgist } from 'nostalgist'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLoaderData } from 'react-router'
import { unstable_serialize, useSWRConfig } from 'swr'
import useSWRImmutable from 'swr/immutable'
import { client } from '#@/api/client.ts'
import { resolveConsole } from '#@/consoles/registry.ts'
import type { Rom } from '#@/controllers/roms/get-roms.ts'
import { closeAudioContexts, setDualShockController, skipAutoState, startWithoutCamera } from '#@/emulator/adapter.ts'
import { connectOnScreenGamepad, disconnectOnScreenGamepad } from '#@/emulator/on-screen-gamepad.ts'
import { getSessionPhase } from '#@/emulator/session.ts'
import { buildInputConfig } from '#@/input/build-input-config.ts'
import {
  useEmulatorLaunched,
  useIsFullscreen,
  useLaunchButton,
  useSpatialNavigationPaused,
} from '#@/pages/library/atoms.ts'
import { useLibraryRefresh } from '#@/pages/library/hooks/use-library-refresh.ts'
import { useRom } from '#@/pages/library/hooks/use-rom.ts'
import { getFileUrl } from '#@/pages/library/utils/file.ts'
import { focus, offCancel, onCancel } from '#@/pages/library/utils/spatial-navigation.ts'
import type { loader } from '#@/pages/routes/library-platform-rom.tsx'
import { getGlobalCSSVars } from '#@/utils/isomorphic/misc.ts'
import { usePreference } from '../../../hooks/use-preference.ts'
import type { useEmulatorGamepadMapping } from '../emulator-session-provider.tsx'

type NostalgistOption = Parameters<typeof Nostalgist.prepare>[0]
type RetroarchConfig = Partial<NostalgistOption['retroarchConfig']>

const defaultRetroarchConfig: RetroarchConfig = {
  fastforward_ratio: 10,
  // RetroArch would otherwise freeze while the page is hidden, before the game can be saved. The page pauses it then
  pause_nonactive: false,
  rewind_granularity: 4,
  rgui_menu_color_theme: 1,
  run_ahead_frames: 1,
  video_gpu_screenshot: true,
  // @ts-expect-error this option is not yet listed in types
  video_viewport_bias_y: 0.1,
}

// A game and its emulator are downloaded only when the player shows they're about to play: when the pointer reaches the
// Start button, a finger touches it, or it's pressed. Browsing past games downloads none of them
const preparations = new Map<string, Promise<Nostalgist | undefined>>()

const remapDirectory = '/home/web_user/retroarch/userdata/config/remaps'

function hasAnalogStickOnScreen() {
  return globalThis.matchMedia?.('(pointer: coarse)').matches ?? false
}

/**
 * Runs one game: prepares it, launches and starts it, saves and exits it. Used once per game, by the session provider
 * around it; components read it with useSession()
 */
export function useEmulatorSessionController({
  emulatorGamepadMapping,
  lazy,
}: {
  emulatorGamepadMapping: ReturnType<typeof useEmulatorGamepadMapping>
  lazy: boolean
}) {
  const rom: Rom = useRom()
  const { state } = useLoaderData<typeof loader>()
  const { preference } = usePreference()
  // The wake lock that keeps the screen on while playing
  const noSleep = useRef<NoSleep | undefined>(undefined)
  // One exit at a time: a double-click on the exit button would otherwise start a second exit while the first runs
  const exitingRef = useRef(false)
  // This session's on-screen gamepad, while the game runs
  const gamepad = useRef<ReturnType<typeof connectOnScreenGamepad> | undefined>(undefined)
  const [exiting, setExiting] = useState(false)
  const [launched, setLaunched] = useEmulatorLaunched()
  const refresh = useLibraryRefresh()
  const [isFullscreen, setIsFullscreen] = useIsFullscreen()
  const [launchButton] = useLaunchButton()
  const [, setSpatialNavigationPaused] = useSpatialNavigationPaused()

  const romUrl = getFileUrl(rom.fileId) || ''
  const { core } = preference.emulator.platform[rom.platform] || {}
  // How this emulator is started and run, from the console registry
  const launchProfile = useMemo(() => resolveConsole(rom.platform, core).launch, [rom.platform, core])

  const platformShader = preference.emulator.platform[rom.platform].shader
  const shader =
    platformShader === 'inherit' ? preference.emulator.shader : (platformShader ?? preference.emulator.shader)

  const romObject = useMemo(() => ({ fileContent: romUrl, fileName: rom?.fileName }), [rom, romUrl])
  const bios = preference.emulator.platform[rom.platform].bioses.map(({ fileId, fileName }) => ({
    fileContent: getFileUrl(fileId),
    fileName,
  }))
  const options: NostalgistOption = useMemo(
    () => ({
      bios,
      core,
      retroarchConfig: {
        ...defaultRetroarchConfig,
        // The keyboard, gamepad and on-screen gamepad, as this console's controller
        ...buildInputConfig({
          console: resolveConsole(rom.platform, core),
          gamepad: emulatorGamepadMapping,
          keyboard: preference.input.keyboardMapping,
          remapDirectory,
          touch: hasAnalogStickOnScreen(),
        }).retroarchConfig,
        rewind_buffer_size: launchProfile.rewindBufferSize,
        rewind_enable: preference.emulator.platform[rom.platform].rewindEnabled,
        run_ahead_enabled: launchProfile.runAhead,
        video_smooth: preference.emulator.videoSmooth,
        // A larger audio buffer keeps sound from crackling when a frame takes too long
        ...(launchProfile.audioLatency ? { audio_latency: launchProfile.audioLatency } : {}),
      },
      retroarchCoreConfig: preference.emulator.core[core],
      rom: romObject,
      shader,
      state: state?.fileId ? getFileUrl(state.fileId) : undefined,
    }),
    [romObject, bios, core, preference, emulatorGamepadMapping, shader, state?.fileId, rom.platform, launchProfile],
  )

  // A game is prepared on mount only when there's none yet, or the last one has been shut down. Preparing again while
  // one runs would swap the running game for a fresh copy, which exit would then find not running and leave alone
  const { cache } = useSWRConfig()
  const cached = (cache.get(unstable_serialize(options)) as undefined | { data?: Nostalgist })?.data
  const {
    data,
    error,
    isValidating,
    mutate: prepare,
  } = useSWRImmutable(options, () => Nostalgist.prepare(options), {
    revalidateOnMount: !lazy && (!cached || cached.getStatus() === 'terminated'),
  })

  const emulator = data
  // While a lazy game downloads, Start can still be pressed: it waits for the download
  const isPreparing = !rom || (isValidating && !lazy)
  const isDownloading = isValidating

  // Starts downloading the game, once however often it's asked for
  async function prepareOnce() {
    const key = unstable_serialize(options)
    let preparation = preparations.get(key)
    if (!preparation) {
      preparation = (async () => {
        try {
          return await prepare()
        } finally {
          preparations.delete(key)
        }
      })()
      preparations.set(key, preparation)
    }
    return await preparation
  }

  // Called when the player looks about to start the game
  async function warmUp() {
    if (lazy && !data) {
      await attemptAsync(prepareOnce)
    }
  }

  async function launch({ withState }: { withState?: boolean } = {}) {
    // In a lazy session nothing is downloaded until now
    const emulator = data ?? (lazy ? await prepareOnce() : undefined)
    if (!emulator || !rom) {
      return
    }

    if (!withState) {
      skipAutoState(emulator)
    }

    if (launchProfile.dualShockRemap && hasAnalogStickOnScreen()) {
      setDualShockController(emulator, remapDirectory)
    }

    const canvas = emulator.getCanvas()
    canvas.setAttribute('tabindex', '-1')
    canvas.dataset.snFocusStyle = JSON.stringify({ display: 'none' })
    focus(canvas)

    setLaunched(true)

    await client.launch_records.$post({ form: { core, rom: rom.id } })
  }

  async function start() {
    if (!emulator || !rom) {
      return
    }
    await startWithoutCamera(emulator)
    // The on-screen controls that need more than key presses: the N64's analog stick, the ColecoVision's joystick and
    // keypad, the arcade, Atari and Channel F sticks, the Atari 5200's keypad, the PlayStation's two analog sticks,
    // the Virtual Boy's right d-pad, the Disk System's flip disk button and the Odyssey²'s joystick
    if (launchProfile.attachVirtualGamepad) {
      gamepad.current = connectOnScreenGamepad(emulator)
    }
    const canvas = emulator.getCanvas()
    if (canvas) {
      canvas.style.opacity = '1'
      const cssVars = getGlobalCSSVars(preference)
      if (cssVars['--game-saturate'] !== '100%') {
        canvas.style.filter = `saturate(var(--game-saturate))`
      }
      focus('canvas')
    }

    if (preference.emulator.fullscreen) {
      await toggleFullscreen()
    }
    onCancel(noop)
    noSleep.current ||= new NoSleep()
    await noSleep.current.enable()

    // ad-hoc patch for mupen64plus_next
    if (launchProfile.nudgeAfterStart) {
      await delay(0)
      emulator.sendCommand('PAUSE_TOGGLE')
      await delay(0)
      emulator.sendCommand('PAUSE_TOGGLE')
    }
  }

  async function exit({ reloadAfterExit = false } = {}) {
    const status = emulator?.getStatus() || ''
    if (exitingRef.current || !['paused', 'running'].includes(status)) {
      return
    }
    exitingRef.current = true
    setExiting(true)
    try {
      try {
        emulator?.exit()
      } finally {
        // The canvas covers the whole page and hides the cursor, so it has to go even if shutting down failed
        emulator?.getCanvas().remove()
        setLaunched(false)
      }
      // Otherwise the browser would keep the shut-down emulator, and the game in its memory, for as long as the page is open
      disconnectOnScreenGamepad(gamepad.current)
      gamepad.current = undefined
      await attemptAsync(closeAudioContexts)
      noSleep.current?.disable()
      const promises: Promise<void>[] = []
      if (document.fullscreenElement) {
        promises.push(document.exitFullscreen())
      }
      await attemptAsync(() => Promise.all(promises))
      setSpatialNavigationPaused(false)
      setIsFullscreen(false)
      focus(launchButton)
      offCancel()
      // The game is let go, to be downloaded again when it's next started
      await (lazy ? prepare(undefined, { revalidate: false }) : attemptAsync(prepare))
      if (reloadAfterExit) {
        await refresh()
      }
    } finally {
      exitingRef.current = false
      setExiting(false)
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } else {
        await document.body.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch {}

    if (emulator) {
      focus(emulator.getCanvas())
    }
  }

  useEffect(() => {
    const abortController = new AbortController()
    document.body.addEventListener(
      'fullscreenchange',
      () => {
        setIsFullscreen(document.fullscreenElement === document.body)
      },
      { signal: abortController.signal },
    )
    return () => {
      abortController.abort()
    }
  })

  return {
    core,
    emulator,
    error,
    exit,
    isDownloading,
    isFullscreen,
    isPreparing,
    launch,
    launched,
    launchProfile,
    phase: getSessionPhase({ exiting, launched, preparing: isDownloading }),
    prepare,
    setLaunched,
    start,
    toggleFullscreen,
    warmUp,
  }
}
