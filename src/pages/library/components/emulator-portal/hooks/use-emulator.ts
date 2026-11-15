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
import {
  closeAudioContexts,
  readGameSave,
  restoreGameSave,
  setDualShockController,
  skipAutoState,
  startWithoutCamera,
  switchDisc,
} from '#@/emulator/adapter.ts'
import { connectOnScreenGamepad, disconnectOnScreenGamepad } from '#@/emulator/on-screen-gamepad.ts'
import { saveQueue } from '#@/emulator/save-queue.ts'
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
import { createDiscList } from '#@/utils/isomorphic/discs.ts'
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

// A save that's one byte over and over is what an emulator writes before the game has saved anything
function isBlank(content: Uint8Array) {
  return content.every((byte) => byte === content[0])
}

function isSame(a: Uint8Array, b: Uint8Array | undefined) {
  return b !== undefined && a.length === b.length && a.every((byte, index) => byte === b[index])
}

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
  // The page the game is played from gives its discs, when it's on several: the game's page or the home page
  const { discs = [], gameSave, state } = useLoaderData<typeof loader>() as Partial<Awaited<ReturnType<typeof loader>>>
  // A game on several discs is given the emulator as a disc list and its discs; only the first downloads at start
  const multiDisc = discs.length > 1
  const [currentDisc, setCurrentDisc] = useState(discs[0]?.number ?? 1)
  // Whether the game was launched to continue from the latest save
  const withStateRef = useRef(false)
  // The game's own save as this page last knew it: put back at launch, or read out while playing. `from` is the server's
  // save it came from, so a newer one from another device is fetched instead
  const knownGameSave = useRef<{ content?: Uint8Array; from?: string }>({})
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
  const { launch: launchProfile, saveFileType } = useMemo(
    () => resolveConsole(rom.platform, core),
    [rom.platform, core],
  )

  const platformShader = preference.emulator.platform[rom.platform].shader
  const shader =
    platformShader === 'inherit' ? preference.emulator.shader : (platformShader ?? preference.emulator.shader)

  const romObject = useMemo(
    () =>
      multiDisc
        ? [
            {
              fileContent: new Blob([createDiscList(discs.map(({ fileName }) => fileName))]),
              fileName: `${rom.discGroup}.m3u`,
            },
            ...discs.map(({ fileId, fileName }) => ({ fileContent: getFileUrl(fileId), fileName })),
          ]
        : { fileContent: romUrl, fileName: rom?.fileName },
    [discs, multiDisc, rom, romUrl],
  )
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
      // The game's own save is named as this emulator names it, and put in place at launch. Nostalgist's types only list
      // srm and sav, but it takes any extension
      sramType: saveFileType as 'srm',
      // A game on several discs is continued once started, after its disc is put in
      state: state?.fileId && !multiDisc ? getFileUrl(state.fileId) : undefined,
    }),
    [
      romObject,
      bios,
      core,
      preference,
      emulatorGamepadMapping,
      shader,
      state?.fileId,
      rom.platform,
      launchProfile,
      multiDisc,
      saveFileType,
    ],
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
    const save = await getGameSave()
    if (save) {
      restoreGameSave(emulator, save)
    }
    withStateRef.current = Boolean(withState)
    setCurrentDisc(discs[0]?.number ?? 1)

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

  /** The game's own save to put back: the latest this page knows, or the server's when it has a newer one */
  async function getGameSave() {
    const known = knownGameSave.current
    if (gameSave && gameSave.id !== known.from) {
      const [, content] = await attemptAsync(async () => {
        const response = await fetch(getFileUrl(gameSave.fileId))
        if (!response.ok) {
          throw new Error(`${response.status}`)
        }
        return new Uint8Array(await response.arrayBuffer())
      })
      if (content) {
        knownGameSave.current = { content, from: gameSave.id }
      }
    }
    return knownGameSave.current.content
  }

  /**
   * Reads the game's own save and, when it changed, keeps it through the save queue. The save is read before this
   * returns its promise, so a page being hidden or a game being exited has it already
   */
  function keepGameSave() {
    if (!emulator || !rom || !core || !['paused', 'running'].includes(emulator.getStatus())) {
      return Promise.resolve()
    }
    const content = readGameSave(emulator)
    if (!content || isBlank(content) || isSame(content, knownGameSave.current.content)) {
      return Promise.resolve()
    }
    knownGameSave.current = { ...knownGameSave.current, content }
    return attemptAsync(() =>
      saveQueue.save({ core, file: new Blob([content]), fileType: saveFileType, rom: rom.id, type: 'game' }),
    ).then(noop)
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

    if (multiDisc && withStateRef.current && state?.fileId) {
      await switchToDisc(state.disc ?? discs[0].number, discs[0].number)
      await emulator.loadState(getFileUrl(state.fileId))
    }
  }

  /** Puts disc `number` of a game on several discs in the drive */
  async function switchToDisc(number: number, from = currentDisc) {
    const to = discs.findIndex((disc) => disc.number === number)
    const current = discs.findIndex((disc) => disc.number === from)
    if (!emulator || to === -1 || current === -1 || to === current) {
      return
    }
    await switchDisc(emulator, current + 1, to + 1)
    setCurrentDisc(number)
  }

  async function exit({ reloadAfterExit = false } = {}) {
    const status = emulator?.getStatus() || ''
    if (exitingRef.current || !['paused', 'running'].includes(status)) {
      return
    }
    exitingRef.current = true
    setExiting(true)
    // Read before the emulator shuts down; uploaded while the rest of the exit goes on
    const keeping = keepGameSave()
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
        await keeping
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
    currentDisc: multiDisc ? currentDisc : undefined,
    discs: multiDisc ? discs : [],
    emulator,
    error,
    exit,
    isDownloading,
    isFullscreen,
    isPreparing,
    keepGameSave,
    launch,
    launched,
    launchProfile,
    phase: getSessionPhase({ exiting, launched, preparing: isDownloading }),
    prepare,
    setLaunched,
    start,
    switchToDisc,
    toggleFullscreen,
    warmUp,
  }
}
