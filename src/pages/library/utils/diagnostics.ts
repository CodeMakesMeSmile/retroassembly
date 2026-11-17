// Temporary: on PSP game pages, everything that would help tell why a game doesn't run on a phone is sent to the
// server's log: the device and its graphics, every console message (the emulator writes its own there), errors, and
// the frame rate every few seconds. Removed once that's solved

const lines: string[] = []
const session = Math.random().toString(36).slice(2, 8)
const started = performance.now()
let running = false

function add(line: string) {
  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  lines.push(`${seconds}s ${line}`.slice(0, 2000))
}

function describe(value: unknown) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? ` | ${value.stack.split('\n').slice(0, 4).join(' | ')}` : ''}`
  }
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value).slice(0, 500)
    } catch {}
  }
  return String(value)
}

function send(useBeacon = false) {
  if (lines.length === 0) {
    return
  }
  const body = JSON.stringify({ lines: lines.splice(0, 500), session })
  if (useBeacon) {
    navigator.sendBeacon('/api/v1/diagnostics', new Blob([body], { type: 'application/json' }))
    return
  }
  fetch('/api/v1/diagnostics', { body, headers: { 'Content-Type': 'application/json' }, method: 'POST' }).catch(
    () => {},
  )
}

function describeDevice() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  const graphics = gl
    ? {
        maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        version: gl.getParameter(gl.VERSION),
      }
    : 'no WebGL 2'
  return {
    cores: navigator.hardwareConcurrency,
    graphics,
    isolated: globalThis.crossOriginIsolated,
    memoryGB: (navigator as { deviceMemory?: number }).deviceMemory,
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    storage: typeof navigator.storage?.getDirectory === 'function',
    userAgent: navigator.userAgent,
  }
}

/** Starts reporting, once per page */
export function startDiagnostics() {
  if (running || typeof window === 'undefined') {
    return
  }
  running = true
  add(`page ${location.pathname}`)
  try {
    add(`device ${JSON.stringify(describeDevice())}`)
  } catch (error) {
    add(`device unknown: ${describe(error)}`)
  }

  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      add(`${level} ${args.map((arg) => describe(arg)).join(' ')}`)
      original(...args)
    }
  }
  addEventListener('error', (event) => {
    add(`error event ${event.message} at ${event.filename}:${event.lineno} ${describe(event.error)}`)
  })
  addEventListener('unhandledrejection', (event) => {
    add(`unhandled rejection ${describe(event.reason)}`)
  })
  addEventListener('webglcontextlost', () => add('webgl context lost'), true)
  document.addEventListener('visibilitychange', () => {
    add(`visibility ${document.visibilityState}`)
    if (document.visibilityState === 'hidden') {
      send(true)
    }
  })

  // The emulator's sound: each chunk is queued to start where the last ends. A chunk that comes after that point leaves
  // a gap, heard as the sound cutting out. Also how far ahead sound is queued (heard as lag), and how much sound the
  // emulator makes each second, which is short of a second when it runs slower than the game
  const audio = { ahead: 0, chunks: 0, end: 0, gapMs: 0, gaps: 0, made: 0 }
  const originalStart = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function start(this: AudioBufferSourceNode, when = 0, ...rest: number[]) {
    const now = this.context.currentTime
    const duration = this.buffer?.duration ?? 0
    if (audio.end > 0 && when - audio.end > 0.002) {
      audio.gaps += 1
      audio.gapMs += (when - audio.end) * 1000
    }
    audio.end = Math.max(audio.end, when + duration)
    audio.ahead += when - now
    audio.chunks += 1
    audio.made += duration
    return originalStart.call(this, when, ...rest)
  }

  // Frames the page draws each second, and the longest gap between two, with whether the game is showing
  let frames = 0
  let longest = 0
  let last = performance.now()
  function tick(now: number) {
    frames += 1
    longest = Math.max(longest, now - last)
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  setInterval(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas#canvas, canvas')
    const game = canvas ? `canvas ${canvas.width}x${canvas.height} shown=${canvas.style.opacity === '1'}` : 'no canvas'
    add(`frames ${Math.round(frames / 5)}/s longest ${Math.round(longest)}ms ${game}`)
    if (audio.chunks > 0) {
      add(
        `sound ${(audio.made / 5).toFixed(2)}s/s, ${audio.gaps} gaps ${Math.round(audio.gapMs)}ms, queued ahead ${Math.round((audio.ahead / audio.chunks) * 1000)}ms`,
      )
    }
    Object.assign(audio, { ahead: 0, chunks: 0, gapMs: 0, gaps: 0, made: 0 })
    frames = 0
    longest = 0
    send()
  }, 5000)
  setInterval(() => send(), 2000)
}
