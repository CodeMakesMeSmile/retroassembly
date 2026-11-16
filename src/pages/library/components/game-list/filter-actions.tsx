import { FavoriteButton } from './favorite-button.tsx'
import { SortDropdown } from './sort-dropdown.tsx'
import { useGameListActions } from './use-game-list-actions.ts'

export function FilterActions() {
  const {
    showFavoriteButton,
    showSortDropdown,
    isViewingFavorites,
    getFavoriteToggleLink,
    direction,
    sort,
    buildSortLink,
    query,
  } = useGameListActions()

  return (
    <div className='ml-auto flex gap-2'>
      {showFavoriteButton && (
        <FavoriteButton isViewingFavorites={isViewingFavorites} getToggleLink={getFavoriteToggleLink} />
      )}
      {showSortDropdown && (
        <SortDropdown
          buildSortLink={buildSortLink}
          currentDirection={direction}
          currentSort={sort}
          searching={Boolean(query)}
        />
      )}
    </div>
  )
}
