import { useEffect } from 'react'
import { useRevalidator } from 'react-router'
import { saveQueue } from '#@/emulator/save-queue.ts'

// Uploads saves the browser kept when the page was closed before they reached the server, then reloads the page data
// so Continue picks them up
export function useUploadPendingSaves() {
  const { revalidate } = useRevalidator()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const uploaded = await saveQueue.flush()
      if (uploaded && !cancelled) {
        await revalidate()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [revalidate])
}
