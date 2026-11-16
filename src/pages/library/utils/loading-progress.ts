import type { DownloadKind } from './download.ts'

export interface Download {
  kind: DownloadKind
  loaded: number
  /** Unknown when the server didn't say */
  total?: number
}

/** How far a game has got loading, for its Start button */
export interface LoadingProgress {
  /** All the downloads together, from 0 to 1, when every size is known */
  fraction?: number
  /** The largest download still under way: its bytes so far, and its size */
  loaded?: number
  /** What's under way: the largest download still going, or starting once they've all arrived */
  step: 'starting' | DownloadKind
  total?: number
}

/** What a game's loading comes to, from its downloads so far */
export function getLoadingProgress(downloads: Iterable<Download>): LoadingProgress {
  const list = [...downloads]
  const unfinished = list.filter(({ loaded, total }) => total === undefined || loaded < total)
  const sized = list.every(({ total }) => total !== undefined)
  const total = list.reduce((sum, download) => sum + (download.total ?? 0), 0)
  const loaded = list.reduce((sum, download) => sum + download.loaded, 0)
  const fraction = sized && total > 0 ? Math.min(loaded / total, 1) : undefined
  if (unfinished.length === 0) {
    return { fraction: 1, step: 'starting' }
  }
  const [largest] = unfinished.toSorted((a, b) => (b.total ?? b.loaded) - (a.total ?? a.loaded))
  return { fraction, loaded: largest.loaded, step: largest.kind, total: largest.total }
}
