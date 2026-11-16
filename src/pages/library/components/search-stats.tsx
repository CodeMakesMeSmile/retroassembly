import { Trans, useTranslation } from 'react-i18next'

interface SearchStatsProps {
  matchCount: number
  query: string
  searchedCount: number
}

/** "143 of 15,615 games match “mario”", for a list being searched */
export function SearchStats({ matchCount, query, searchedCount }: Readonly<SearchStatsProps>) {
  const { t, i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language)
  return (
    <Trans
      components={{ 1: <span className='font-semibold text-(--accent-9)' /> }}
      i18nKey='stats.searchMatches'
      values={{
        game: t('common.game', { count: searchedCount }),
        matchCount: format.format(matchCount),
        query,
        searchedCount: format.format(searchedCount),
      }}
    />
  )
}
