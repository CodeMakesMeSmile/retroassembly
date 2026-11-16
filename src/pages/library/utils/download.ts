// Downloads that report how far they've got, so loading a game can show its progress

/** What a download is for, which is what the player is told when it's under way, or when it fails */
export type DownloadKind = 'emulator' | 'files' | 'game'

/** A download that failed, and what it was for */
export class DownloadError extends Error {
  readonly kind: DownloadKind

  constructor(kind: DownloadKind, cause: unknown) {
    super(`Failed to download the ${kind}`, { cause })
    this.name = 'DownloadError'
    this.kind = kind
  }
}

type ProgressListener = (loaded: number, total: number | undefined) => void

/**
 * Downloads `url` into one buffer, calling `onProgress` as it arrives. With the size known in advance the bytes go
 * straight into a buffer of that size, so a large game is held once, not once per piece and again when joined
 */
export async function downloadWithProgress(
  url: string,
  { kind, onProgress, signal }: { kind: DownloadKind; onProgress?: ProgressListener; signal?: AbortSignal },
) {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    // A compressed response's length is of the compressed bytes, not of what's read here
    const encoded = response.headers.get('Content-Encoding')
    const length = Number(response.headers.get('Content-Length'))
    const total = !encoded && length > 0 ? length : undefined
    onProgress?.(0, total)
    if (!response.body) {
      const buffer = await response.arrayBuffer()
      onProgress?.(buffer.byteLength, buffer.byteLength)
      return buffer
    }

    const reader = response.body.getReader()
    let buffer = new Uint8Array(total ?? 1_048_576)
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (loaded + value.length > buffer.length) {
        const grown = new Uint8Array(Math.max(buffer.length * 2, loaded + value.length))
        grown.set(buffer.subarray(0, loaded))
        buffer = grown
      }
      buffer.set(value, loaded)
      loaded += value.length
      onProgress?.(loaded, total)
    }
    onProgress?.(loaded, loaded)
    return loaded === buffer.length ? buffer.buffer : buffer.slice(0, loaded).buffer
  } catch (error) {
    throw new DownloadError(kind, error)
  }
}
