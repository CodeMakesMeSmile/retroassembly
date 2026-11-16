import type { Nostalgist } from 'nostalgist'
import { type SaveFiles, zipSaveFiles } from './save-folder.ts'

// The only module that reaches into the emulator's internals: Nostalgist's private emulator, the Emscripten file system
// and Module, and JSEvents, the emulator's own input handlers. Everything else goes through these functions

export { applyVolume, closeAudioContexts, getVolume, type Volume } from './audio.ts'

// Nostalgist's emulator, with the private members used here
interface InnerEmulator {
  callCommand: (command: string) => void
  clearStateFile: () => void
  on: (event: 'beforeLaunch', listener: () => void) => void
  sendCommand: (command: string) => void
  sramFilePath: string
  stateFilePath: string
  stateThumbnailFilePath: string
}

function getInner(emulator: Nostalgist) {
  return emulator.getEmulator() as unknown as InnerEmulator
}

/** Starts the game without the state RetroArch saved automatically last time, which would otherwise be loaded */
export function skipAutoState(emulator: Nostalgist) {
  getInner(emulator).on('beforeLaunch', () => {
    try {
      emulator.getEmscriptenFS().unlink(`${getInner(emulator).stateFilePath}.auto`)
    } catch {}
  })
}

/** Puts the game's own save (memory card, battery save) where the emulator looks for it, before the game boots */
export function restoreGameSave(emulator: Nostalgist, save: Uint8Array) {
  getInner(emulator).on('beforeLaunch', () => {
    const fs = emulator.getEmscriptenFS()
    const filePath = getInner(emulator).sramFilePath
    fs.mkdirTree(filePath.slice(0, filePath.lastIndexOf('/')))
    fs.writeFile(filePath, save)
  })
}

/**
 * Reads the game's own save as it is now. RetroArch writes it out when told, straight away, so this needs no frames to
 * run and works while the game is paused or the page is being hidden. Nothing is returned when the game has nothing
 * saved yet (some emulators write no file until the game saves)
 */
export function readGameSave(emulator: Nostalgist) {
  const fs = emulator.getEmscriptenFS()
  const inner = getInner(emulator)
  try {
    inner.callCommand('_cmd_savefiles')
    return new Uint8Array(fs.readFile(inner.sramFilePath) as Uint8Array)
  } catch {}
}

// Where RetroArch keeps saves and system files, in the emulator's file system
const savesDirectory = '/home/web_user/retroarch/userdata/saves'
const systemDirectory = '/home/web_user/retroarch/userdata/system'

type EmscriptenFS = ReturnType<Nostalgist['getEmscriptenFS']>

function listFiles(fs: EmscriptenFS, directory: string, prefix = ''): SaveFiles {
  let names: string[]
  try {
    names = fs.readdir(directory) as string[]
  } catch {
    return []
  }
  return names
    .filter((name) => name !== '.' && name !== '..')
    .flatMap((name) => {
      const path = `${directory}/${name}`
      const { mode } = fs.stat(path)
      return fs.isDir(mode)
        ? listFiles(fs, path, `${prefix}${name}/`)
        : [[`${prefix}${name}`, new Uint8Array(fs.readFile(path) as Uint8Array)] as SaveFiles[number]]
    })
}

function writeFiles(fs: EmscriptenFS, directory: string, files: SaveFiles) {
  for (const [path, content] of files) {
    const filePath = `${directory}/${path}`
    fs.mkdirTree(filePath.slice(0, filePath.lastIndexOf('/')))
    fs.writeFile(filePath, content)
  }
}

/**
 * Reads the game's own saves, for an emulator that keeps them as a folder of files (the PSP's), as one zip. The
 * emulator writes them when the game saves, so this, too, works while the game is paused or the page is being hidden.
 * Nothing is returned when the game has saved nothing yet
 */
export function readGameSaveFolder(emulator: Nostalgist, folder: string) {
  const files = listFiles(emulator.getEmscriptenFS(), `${savesDirectory}/${folder}`)
  return files.length > 0 ? zipSaveFiles(files) : undefined
}

/** Puts the game's own saves back in their folder before the game boots */
export function restoreGameSaveFolder(emulator: Nostalgist, folder: string, files: SaveFiles) {
  getInner(emulator).on('beforeLaunch', () => {
    writeFiles(emulator.getEmscriptenFS(), `${savesDirectory}/${folder}`, files)
  })
}

/** Puts files an emulator needs besides the game (PPSSPP's fonts and dialog graphics) in RetroArch's system folder */
export function installSystemFiles(emulator: Nostalgist, files: SaveFiles) {
  getInner(emulator).on('beforeLaunch', () => {
    writeFiles(emulator.getEmscriptenFS(), systemDirectory, files)
  })
}

// PCSX ReARMed's DualShock: libretro's analog controller (5), the second of its kinds, as RetroArch numbers it.
// RetroArch only takes a controller type for a core from its remap file, which is written before each launch
const dualShock = 517

/** Tells the PlayStation's emulator its controller is a DualShock, with a remap file written before it launches */
export function setDualShockController(emulator: Nostalgist, remapDirectory: string) {
  getInner(emulator).on('beforeLaunch', () => {
    const fs = emulator.getEmscriptenFS()
    const directory = `${remapDirectory}/PCSX-ReARMed`
    fs.mkdirTree(directory)
    fs.writeFile(`${directory}/PCSX-ReARMed.rmp`, `input_libretro_device_p1 = "${dualShock}"\n`)
  })
}

/** Starts the emulator with the camera blocked, which some cores would otherwise ask for, and unblocks it after */
export async function startWithoutCamera(emulator: Nostalgist) {
  const mediaDevices = globalThis.navigator?.mediaDevices
  const getUserMedia = mediaDevices?.getUserMedia
  try {
    // @ts-expect-error blocking the camera request by removing the function the core would call
    mediaDevices.getUserMedia = null
  } catch {}
  try {
    await emulator.start()
  } finally {
    try {
      if (mediaDevices) {
        mediaDevices.getUserMedia = getUserMedia
      }
    } catch {}
  }
}

/**
 * Saves the game straight away, for a page being hidden. Browsers stop the animation frames that drive the emulator as
 * soon as a page is hidden, so a normal save would only finish once the page is shown again, if it still exists by
 * then. Cores built for this fork (DS) let the page run the main loop itself, so the save can finish right away.
 * Returns nothing for other cores.
 */
export function saveStateImmediately(emulator: Nostalgist): undefined | { state: Blob; thumbnail: Blob } {
  const { Module } = emulator.getEmscripten() as { Module: { runMainLoopIterations?: (count: number) => boolean } }
  const { runMainLoopIterations } = Module
  if (!runMainLoopIterations) {
    return
  }
  const inner = getInner(emulator)
  const fs = emulator.getEmscriptenFS()
  function sizeOf(filePath: string) {
    try {
      return Number(fs.stat(filePath).size)
    } catch {
      return 0
    }
  }
  inner.clearStateFile()
  inner.sendCommand('SAVE_STATE')
  const files = [inner.stateFilePath, inner.stateThumbnailFilePath]
  let lastSizes = ''
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (!runMainLoopIterations(1)) {
      return
    }
    // A file is done once it exists and stops growing between iterations
    const sizes = files.map((file) => sizeOf(file))
    const key = sizes.join(',')
    if (sizes.every(Boolean) && key === lastSizes) {
      const [state, thumbnail] = files.map(
        (file) =>
          new Blob([fs.readFile(file) as Uint8Array<ArrayBuffer>], {
            type: file.endsWith('.png') ? 'image/png' : 'application/octet-stream',
          }),
      )
      inner.clearStateFile()
      return { state, thumbnail }
    }
    lastSizes = key
  }
}

/**
 * Sends a key to RetroArch the way the emulator's own buttons do: straight to its keyboard handlers, as if from the
 * game's canvas. A real key press in a text field isn't seen by RetroArch, which ignores text fields
 */
export function sendKey(emulator: Nostalgist, type: 'keydown' | 'keyup', code: string) {
  const { JSEvents } = emulator.getEmscripten() as {
    JSEvents: { eventHandlers: { eventListenerFunc: (event: unknown) => void; eventTypeString: string }[] }
  }
  const target = emulator.getCanvas()
  for (const { eventListenerFunc, eventTypeString } of JSEvents.eventHandlers) {
    if (eventTypeString === type) {
      try {
        eventListenerFunc({ code, target })
      } catch {}
    }
  }
}

/** A gamepad the emulator reads alongside real ones, as the browser's Gamepad API describes one */
export interface EmulatorGamepad {
  axes: number[]
  buttons: { pressed: boolean; touched: boolean; value: number }[]
  connected: boolean
  id: string
  index: number
  mapping: string
  timestamp: number
}

/**
 * Lets the emulator read `gamepad` as its first controller, unless a real controller is there. It's added to the
 * gamepads the emulator reads each frame, not to navigator.getGamepads(), so the rest of the page doesn't take it for a
 * real controller
 */
export function attachGamepad(emulator: Nostalgist, gamepad: EmulatorGamepad) {
  const { JSEvents } = emulator.getEmscripten() as { JSEvents?: Record<string, unknown> }
  if (!JSEvents) {
    return
  }
  function withGamepad(gamepads: (Gamepad | null)[] | null | undefined) {
    const list: unknown[] = gamepads ? [...gamepads] : []
    // A real controller in the first slot is the one being played with; the on-screen controls are hidden then
    if (list[0]) {
      return list
    }
    gamepad.timestamp = performance.now()
    list[0] = gamepad
    return list
  }
  // Each frame the emulator stores what navigator.getGamepads() returns here, then reads its gamepads from it
  let gamepads: unknown
  Object.defineProperty(JSEvents, 'lastGamepadState', {
    configurable: true,
    get: () => gamepads,
    set: (value) => {
      gamepads = withGamepad(value)
    },
  })
  // The emulator only starts reading a gamepad once it's told one is connected. A real GamepadEvent can't carry an
  // object that isn't a real gamepad, so a plain event with the same shape is sent; the emulator only reads its gamepad
  const event = new Event('gamepadconnected')
  Object.defineProperty(event, 'gamepad', { value: gamepad })
  globalThis.dispatchEvent(event)
}

/** Moves a few shaders' files to where their presets look for them, before the emulator launches */
export function relocateShaderFiles(nostalgist: Nostalgist, path: { join: (...parts: string[]) => string }) {
  const FS = nostalgist.getEmscriptenFS()
  const options = nostalgist.getOptions()
  const shadersDirectory = '/home/web_user/retroarch/bundle/shaders/shaders_glsl/shaders'
  switch (options.shader) {
    case 'crt/crt-easymode-halation':
      FS.mkdirTree(path.join(shadersDirectory, 'crt-easymode-halation'))
      for (const name of ['linearize', 'blur_horiz', 'blur_vert', 'threshold', 'crt-easymode-halation']) {
        FS.rename(
          path.join(shadersDirectory, `${name}.glsl`),
          path.join(shadersDirectory, 'crt-easymode-halation', `${name}.glsl`),
        )
      }

      break

    case 'crt/crt-interlaced-halation':
      FS.mkdirTree(path.join(shadersDirectory, 'crt-interlaced-halation'))
      for (const n of [0, 1, 2]) {
        FS.rename(
          path.join(shadersDirectory, `crt-interlaced-halation-pass${n}.glsl`),
          path.join(shadersDirectory, 'crt-interlaced-halation', `crt-interlaced-halation-pass${n}.glsl`),
        )
      }
      FS.mkdirTree('/home/web_user/retroarch/bundle/shaders/interpolation/shaders')
      FS.rename(
        path.join(shadersDirectory, 'quilez.glsl'),
        path.join('/home/web_user/retroarch/bundle/shaders/interpolation/shaders/quilez.glsl'),
      )

      break
  }
}

/**
 * Puts another disc of a game on several discs in the drive. Discs are numbered by their place in the disc list, from 1.
 * Nostalgist only learns which disc is in once it has swapped one, so it's told the disc in the drive first
 */
export async function switchDisc(emulator: Nostalgist, from: number, to: number) {
  const { options } = emulator.getEmulator() as unknown as { options: { multiDiscIndex?: number } }
  options.multiDiscIndex ??= from
  await emulator.switchDisc(to)
}
