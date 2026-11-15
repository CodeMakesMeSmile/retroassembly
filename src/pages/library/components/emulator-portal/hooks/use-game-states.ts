import useSWRImmutable from 'swr/immutable'
import useSWRMutation from 'swr/mutation'
import { client, parseResponse } from '#@/api/client.ts'
import { saveQueue } from '#@/emulator/save-queue.ts'
import { captureCanvasThumbnail, captureState, captureThumbnail } from '#@/emulator/saves.ts'
import { useShowGameOverlayContent } from '#@/pages/library/atoms.ts'
import { useSession } from '#@/pages/library/components/emulator-portal/emulator-session-provider.tsx'
import { useRom } from '#@/pages/library/hooks/use-rom.ts'

const { $get } = client.states

export function useGameStates() {
  const rom = useRom()
  const { core, currentDisc, emulator, launchProfile } = useSession()
  const [showGameOverlay] = useShowGameOverlayContent()

  const {
    data: manualStates,
    isLoading: isStatesLoading,
    mutate: reloadStates,
  } = useSWRImmutable(
    rom ? { endpoint: '/api/v1/roms/:id/states', query: { rom: rom.id, type: 'manual' } as const } : false,
    ({ query }) => parseResponse($get({ query })),
  )

  const { data: autoStates, mutate: reloadAutoStates } = useSWRImmutable(
    rom ? { endpoint: '/api/v1/roms/:id/states', query: { rom: rom.id, type: 'auto' } as const } : false,
    ({ query }) => parseResponse($get({ query })),
    { dedupingInterval: 0, revalidateOnMount: true },
  )

  const states = [...(manualStates || []), ...(autoStates || [])]

  const { isMutating: isSavingManualState, trigger: saveManualState } = useSWRMutation(
    '/api/v1/states',
    // A save of the running game, or of a state file the player loads, with a picture of the screen now
    async (_key, { arg = {} }: { arg?: { state?: Blob; thumbnail?: Blob } }) => {
      if (!emulator || !core || !rom) {
        throw new Error('invalid emulator or core or rom')
      }
      const { canvasThumbnail } = launchProfile
      let captured: { state: Blob; thumbnail: Blob }
      if (arg.state) {
        const thumbnail = canvasThumbnail
          ? await captureCanvasThumbnail(emulator, { height: 3, width: 4 })
          : (arg.thumbnail ?? (await captureThumbnail(emulator)))
        captured = { state: arg.state, thumbnail }
      } else {
        captured = await captureState(emulator, { canvasThumbnail })
      }
      await saveQueue.save({ core, disc: currentDisc, rom: rom.id, type: 'manual', ...captured })
      await Promise.all([reloadStates(), reloadAutoStates()])
    },
  )

  const { isMutating: isSavingAutoState, trigger: saveAutoState } = useSWRMutation('/api/v1/states', async () => {
    if (!emulator || !core || !rom) {
      throw new Error('invalid emulator or core or rom')
    }
    const captured = await captureState(emulator, { canvasThumbnail: launchProfile.canvasThumbnail })
    await saveQueue.save({ core, disc: currentDisc, rom: rom.id, type: 'auto', ...captured })
    await reloadAutoStates()
  })

  return {
    isSavingAutoState,
    isSavingManualState,
    isStatesLoading,
    reloadAutoStates,
    reloadStates,
    saveAutoState,
    saveManualState,
    showGameOverlay,
    states,
  }
}
