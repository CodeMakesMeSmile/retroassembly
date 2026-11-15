import { AlertDialog, Button } from '@radix-ui/themes'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLibraryRefresh } from '../hooks/use-library-refresh.ts'

interface DeleteDialogProps extends AlertDialog.RootProps {
  description: string
  /** Deletes what the dialog is about; the library is refreshed after */
  onConfirm: () => Promise<unknown>
  /** Runs after the deletion and the refresh, for example to clear a selection */
  onDeleted?: () => Promise<void> | void
  title: string
}

/** Asks before deleting games, or removing them from the play history, then brings the library up to date */
export function DeleteDialog({ description, onConfirm, onDeleted, title, ...props }: Readonly<DeleteDialogProps>) {
  const { t } = useTranslation()
  const refresh = useLibraryRefresh()
  const [deleting, setDeleting] = useState(false)

  async function handleClickConfirmDelete() {
    setDeleting(true)
    try {
      await onConfirm()
    } catch {
      setDeleting(false)
      return
    }
    props.onOpenChange?.(false)
    await refresh()
    await onDeleted?.()
    setDeleting(false)
  }

  return (
    <AlertDialog.Root {...props}>
      <AlertDialog.Content maxWidth='450px'>
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description className='leading-loose! whitespace-pre-line' size='2'>
          {description}
        </AlertDialog.Description>

        <div className='mt-4 flex justify-end gap-3'>
          <AlertDialog.Cancel>
            <Button disabled={deleting}>
              <span className='icon-[mdi--close]' />
              {t('common.cancel')}
            </Button>
          </AlertDialog.Cancel>
          <Button loading={deleting} onClick={handleClickConfirmDelete} variant='soft'>
            <span className='icon-[mdi--delete]' />
            {t('common.delete')}
          </Button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}
