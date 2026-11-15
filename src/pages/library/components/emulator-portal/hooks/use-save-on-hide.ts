import { useEffect } from 'react'
import { saveStateImmediately } from '#@/emulator/adapter.ts'
import { useEmulatorLaunched } from '#@/pages/library/atoms.ts'
import { useRom } from '#@/pages/library/hooks/use-rom.ts'
import { putPendingSave, uploadPendingSave } from '#@/pages/library/utils/pending-saves.ts'
import { useEmulator } from './use-emulator.ts'
import { forceGetEmulatorThumbnail, useGameStates } from './use-game-states.ts'

interface SavedState {
  state: Blob
  thumbnail: Blob
}

// Mobile browsers often unload a page soon after you switch to another app, which loses the game. When the page is
// hidden, pause the game and save it, first in the browser and then to the server, and resume it if the page comes back.
export function useSaveOnHide() {
  const { core, emulator } = useEmulator()
  const rom = useRom()
  const [launched] = useEmulatorLaunched()
  const { reloadAutoStates } = useGameStates()

  useEffect(() => {
    if (!launched || !emulator || !core || !rom) {
      return
    }

    let pausedOnHide = false
    let saving: Promise<void> | undefined

    async function persist(saved: SavedState | undefined) {
      if (!emulator || !core || !rom) {
        return
      }
      let result = saved
      if (!result) {
        const fallback = await emulator.saveState()
        const thumbnail =
          core === 'mupen64plus_next'
            ? await forceGetEmulatorThumbnail(emulator, { height: 3, width: 4 })
            : (fallback.thumbnail as Blob)
        result = { state: fallback.state, thumbnail }
      }
      const pending = { core, rom: rom.id, savedAt: Date.now(), ...result }
      try {
        await putPendingSave(pending)
      } catch {}
      await uploadPendingSave(pending)
      await reloadAutoStates()
    }

    // A save that fails to upload stays in the browser and is uploaded the next time the library opens
    async function persistQuietly(saved: SavedState | undefined) {
      try {
        await persist(saved)
      } catch {}
    }

    async function handleVisibilityChange() {
      if (!emulator) {
        return
      }
      if (document.visibilityState === 'hidden') {
        // Leave the game alone when it is already paused, for example with the menu open
        if (emulator.getStatus() !== 'running') {
          return
        }
        emulator.pause()
        pausedOnHide = true
        let saved: SavedState | undefined
        try {
          saved = saveStateImmediately(emulator)
        } catch {}
        saving = persistQuietly(saved)
        return
      }
      if (pausedOnHide) {
        pausedOnHide = false
        await saving
        if (emulator.getStatus() === 'paused') {
          emulator.resume()
        }
      }
    }

    // In the capture phase on window this runs before the emulator's own listener on document, which stops it once the
    // page is hidden
    globalThis.addEventListener('visibilitychange', handleVisibilityChange, { capture: true })
    return () => globalThis.removeEventListener('visibilitychange', handleVisibilityChange, { capture: true })
  }, [launched, emulator, core, rom, reloadAutoStates])
}
