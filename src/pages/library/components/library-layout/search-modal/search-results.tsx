import { clsx } from 'clsx'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import scrollIntoView from 'smooth-scroll-into-view-if-needed'
import { useSpatialNavigationPaused } from '#@/pages/library/atoms.ts'
import { useShowSearchModal } from '../atoms.ts'
import { useSelectedResult } from './atoms.ts'
import { SearchResultItem } from './search-result-item.tsx'

/** The "See all" row, which can be selected like a result */
export const seeAllRow = { id: 'see-all' }

interface SearchResultsProps {
  keyword: string
  loading: boolean
  matchCount: number
  results?: any
  seeAllUrl: string
}

export function SearchResults({ keyword, loading, matchCount, results, seeAllUrl }: Readonly<SearchResultsProps>) {
  if (results?.length) {
    return (
      <ul>
        {results?.map((rom) =>
          rom === seeAllRow ? (
            <SeeAll count={matchCount} key={rom.id} url={seeAllUrl} />
          ) : (
            <SearchResultItem key={rom.id} keyword={keyword} rom={rom} />
          ),
        )}
      </ul>
    )
  }

  if (!loading && !results?.length) {
    return (
      <div className='flex w-full items-center justify-center gap-2 py-4 text-lg opacity-60'>
        <span className='icon-[mdi--magnify-remove-outline] text-xl' />
        No results found
      </div>
    )
  }
}

// Opens every match on the Games page
function SeeAll({ count, url }: Readonly<{ count: number; url: string }>) {
  const { t } = useTranslation()
  const [selectedResult, setSelectedResult] = useSelectedResult()
  const [, setShowSearchModal] = useShowSearchModal()
  const [, setSpatialNavigationPaused] = useSpatialNavigationPaused()
  const selected = selectedResult === seeAllRow
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    ;(async () => {
      if (selected && ref.current) {
        await scrollIntoView(ref.current, { scrollMode: 'if-needed' })
      }
    })()
  }, [selected])

  return (
    <li className='sticky bottom-0 border-t border-(--gray-4) bg-(--color-background) p-1' ref={ref}>
      <Link
        className={clsx(
          'flex h-12 items-center justify-center gap-1 rounded-sm text-base font-semibold text-(--accent-11)',
          { 'bg-(--accent-3)': selected },
        )}
        onClick={() => {
          setSpatialNavigationPaused(false)
          setShowSearchModal(false)
        }}
        onMouseMove={() => {
          if (!selected) {
            setSelectedResult(seeAllRow)
          }
        }}
        to={url}
      >
        {t('search.seeAll', { count })}
        <span className='icon-[mdi--chevron-right] size-5' />
      </Link>
    </li>
  )
}
