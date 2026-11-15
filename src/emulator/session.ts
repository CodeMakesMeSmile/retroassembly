/** What a game session is doing: downloading, ready to start, running, or shutting down */
export type SessionPhase = 'exiting' | 'preparing' | 'ready' | 'running'

export function getSessionPhase({
  exiting,
  launched,
  preparing,
}: {
  exiting: boolean
  launched: boolean
  preparing: boolean
}): SessionPhase {
  if (exiting) {
    return 'exiting'
  }
  if (launched) {
    return 'running'
  }
  return preparing ? 'preparing' : 'ready'
}
