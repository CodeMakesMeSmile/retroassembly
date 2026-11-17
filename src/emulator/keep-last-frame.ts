// The PSP's and N64's save pictures are copied from the game on the screen, as their emulators' own screenshots aren't
// usable. They draw in 3D, and the browser clears a 3D canvas once its picture is shown, unless asked to keep it: a copy
// taken after that was black, about one save in three. While one of these games is open, its canvas is asked to keep
// its last picture until the next is drawn, which costs a little extra work per frame

let keeping = false
let installed = false

function install() {
  if (installed || typeof HTMLCanvasElement === 'undefined') {
    return
  }
  installed = true
  const { getContext } = HTMLCanvasElement.prototype
  // Emscripten creates the emulator's context through getContext, with options of its own; preserveDrawingBuffer is added
  // to them while a game that needs it is open
  HTMLCanvasElement.prototype.getContext = function getContextKeepingFrames(
    this: HTMLCanvasElement,
    type: string,
    options?: unknown,
  ) {
    const is3d = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl'
    const kept = keeping && is3d ? { ...(options as object), preserveDrawingBuffer: true } : options
    return Reflect.apply(getContext, this, [type, kept])
  } as typeof getContext
}

/** Whether 3D canvases created from now on keep their last picture */
export function keepLastFrame(keep: boolean) {
  install()
  keeping = keep
}
