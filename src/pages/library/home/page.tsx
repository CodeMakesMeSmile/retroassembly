import { useTranslation } from 'react-i18next'
import { generatePath, useLoaderData } from 'react-router'
import { useLibraryData } from '#@/pages/library/hooks/use-library-data.ts'
import { routes } from '#@/pages/routes.ts'
import type { loader } from '#@/pages/routes/library-home.tsx'
import { UploadSelectButton } from '../platform/components/upload-select-button.tsx'
import { GeneralSection } from './components/general-section.tsx'
import { HomeEmpty } from './components/home-empty.tsx'
import { JumpBackInSection } from './components/jump-back-in-section.tsx'

export function LibraryHomePage() {
  const { t } = useTranslation()
  const { favoriteRoms, newAddedRoms } = useLoaderData<typeof loader>()
  const { recentlyLaunchedRoms } = useLibraryData()

  const isEmpty = newAddedRoms.length === 0

  if (isEmpty) {
    return <HomeEmpty />
  }

  return (
    <>
      <div>
        <JumpBackInSection />

        {[
          {
            icon: 'icon-[mdi--recent]',
            link: generatePath(routes.libraryHistory),
            roms: recentlyLaunchedRoms,
            title: t('common.recent'),
          },
          {
            icon: 'icon-[mdi--heart]',
            link: generatePath(routes.libraryFavorites),
            roms: favoriteRoms,
            title: t('nav.favorites'),
          },
          {
            icon: 'icon-[mdi--archive-add]',
            link: [generatePath(routes.libraryRoms), new URLSearchParams({ direction: 'desc', sort: 'added' })].join(
              '?',
            ),
            roms: newAddedRoms,
            suffix: <UploadSelectButton />,
            title: t('common.newAdded'),
          },
        ].map((props) => (
          <GeneralSection className='py-4' key={props.title} {...props} />
        ))}
      </div>
    </>
  )
}
