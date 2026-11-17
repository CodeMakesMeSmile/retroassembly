import { clsx } from 'clsx'
import { delay } from 'es-toolkit'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { client, parseResponse } from '#@/api/client.ts'
import { DeleteDialog } from '../delete-dialog.tsx'
import { FilterActions } from './filter-actions.tsx'
import { SelectionActions } from './selection-actions.tsx'
import { SelectionInfo } from './selection-info.tsx'
import { useGameListActions } from './use-game-list-actions.ts'

export function GameListActions() {
  const { roms, selectedGames, setSelectedGames, shouldHideActions, hasSelectedGames, canSelectAll } =
    useGameListActions()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { t } = useTranslation()

  // A shared library's players can search it (with the search in the sidebar), but not change it or filter by favorites
  if (shouldHideActions) {
    return null
  }

  return (
    <div
      className={clsx('flex flex-wrap gap-2 px-4', {
        'justify-between': hasSelectedGames,
        'justify-end': !hasSelectedGames,
      })}
    >
      {hasSelectedGames ? (
        <>
          <SelectionInfo
            selectedCount={selectedGames.length}
            canSelectAll={canSelectAll}
            onSelectAll={() => setSelectedGames(roms.map(({ id }) => id))}
          />
          <SelectionActions
            selectedCount={selectedGames.length}
            onDelete={() => setDeleteDialogOpen(true)}
            onCancel={() => setSelectedGames([])}
          />
          <DeleteDialog
            description={t('dialog.confirmDeleteRomsMessage')}
            onConfirm={() => parseResponse(client.roms.$delete({ query: { ids: selectedGames.join(',') } }))}
            onDeleted={async () => {
              await delay(500) // waiting for the animation
              setSelectedGames([])
            }}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
            title={t('game.deleteSelectedItems', {
              count: selectedGames.length,
              items: t('game.rom', { count: selectedGames.length }),
            })}
          />
        </>
      ) : (
        <FilterActions />
      )}
    </div>
  )
}
