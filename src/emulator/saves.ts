import type { Nostalgist } from 'nostalgist'
import { saveStateImmediately } from './adapter.ts'

/** A snapshot of the game, and a picture of the screen to show it by */
export interface CapturedState {
  state: Blob
  thumbnail: Blob
}

/** A picture of the canvas, cropped to `resolution`'s shape, for emulators whose own screenshots aren't usable */
export async function captureCanvasThumbnail(emulator: Nostalgist, resolution: { height: number; width: number }) {
  const source = emulator.getCanvas()
  const { height, width } = source
  let sw: number
  let sh: number
  let sx: number
  let sy: number
  if (width / height > resolution.width / resolution.height) {
    sh = height
    sw = Math.round(height * (resolution.width / resolution.height))
    sx = Math.round((width - sw) / 2)
    sy = 0
  } else {
    sw = width
    sh = Math.round(width / (resolution.width / resolution.height))
    sx = 0
    sy = Math.round((height - sh) / 2)
  }
  const target = document.createElement('canvas')
  target.width = sw
  target.height = sh
  const context = target.getContext('2d')
  return await new Promise<Blob>((resolve) => {
    requestAnimationFrame(() => {
      context?.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
      target.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        }
      })
    })
  })
}

interface CaptureOptions {
  /** Take the thumbnail from the canvas, for an emulator whose own screenshots aren't usable */
  canvasThumbnail?: boolean
  /** Finish before returning, for a page about to be hidden; falls back to a normal save where that isn't possible */
  immediate?: boolean
}

/** Takes a snapshot of the running game: the one way manual saves, autosaves and saves on hide are made */
export async function captureState(emulator: Nostalgist, { canvasThumbnail, immediate }: CaptureOptions = {}) {
  let captured: CapturedState | undefined
  if (immediate) {
    try {
      captured = saveStateImmediately(emulator)
    } catch {}
  }
  if (!captured) {
    const { state, thumbnail } = await emulator.saveState()
    captured = { state, thumbnail: thumbnail as Blob }
  }
  if (canvasThumbnail) {
    captured.thumbnail = await captureCanvasThumbnail(emulator, { height: 3, width: 4 })
  }
  return captured
}

/** A snapshot from a file the player loads, with a picture of the screen now */
export async function captureThumbnail(emulator: Nostalgist) {
  return await emulator.screenshot()
}
