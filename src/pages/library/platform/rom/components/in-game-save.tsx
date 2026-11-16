import { Button, Dialog, IconButton } from '@radix-ui/themes'
import { fileOpen } from 'browser-fs-access'
import { clsx } from 'clsx'
import { DateTime } from 'luxon'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData } from 'react-router'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { client, parseResponse } from '#@/api/client.ts'
import { resolveConsole } from '#@/consoles/registry.ts'
import { DialogRoot } from '#@/pages/library/components/dialog-root.tsx'
import { useLibraryRefresh } from '#@/pages/library/hooks/use-library-refresh.ts'
import { usePreference } from '#@/pages/library/hooks/use-preference.ts'
import { getFileUrl } from '#@/pages/library/utils/file.ts'
import type { loader } from '#@/pages/routes/library-platform-rom.tsx'
import { getRomGoodcodes } from '#@/utils/client/library.ts'
import { dateFormatMap } from '#@/utils/isomorphic/i18n.ts'
import { humanizeDate } from '#@/utils/isomorphic/misc.ts'

// Files a save from another emulator may come as: RetroArch's .srm, the common .sav, and DeSmuME's .dsv
const uploadExtensions = ['.srm', '.sav', '.dsv']

function useAgo() {
  const { i18n } = useTranslation()
  return (date: Date | string) =>
    DateTime.fromJSDate(new Date(date)).toRelative({ locale: i18n.language, style: 'short' }) ?? ''
}

/**
 * The game's own save (memory card, battery save) on its page: a line saying when it was last kept, which opens its
 * versions. A version can be downloaded or restored, and a save file from another emulator uploaded; either takes
 * effect the next time the game starts
 */
export function InGameSave() {
  const { t } = useTranslation()
  const { gameSave, rom } = useLoaderData<typeof loader>()
  const [open, setOpen] = useState(false)
  const ago = useAgo()

  return (
    <DialogRoot onOpenChange={setOpen} open={open}>
      <Dialog.Trigger>
        <button
          className='mt-3 inline-flex items-center gap-1.5 text-sm text-(--gray-11) hover:text-(--accent-9)'
          data-sn-enabled
          type='button'
        >
          <span className='icon-[mdi--sd] size-4' />
          {gameSave ? t('emulator.savedInGame', { time: ago(gameSave.createdAt) }) : t('emulator.noInGameSave')}
          <span className='icon-[mdi--chevron-right] size-4' />
        </button>
      </Dialog.Trigger>
      {open ? <InGameSaveDialog rom={rom} /> : null}
    </DialogRoot>
  )
}

function InGameSaveDialog({ rom }: Readonly<{ rom: Awaited<ReturnType<typeof loader>>['rom'] }>) {
  const { i18n, t } = useTranslation()
  const { preference } = usePreference()
  const refresh = useLibraryRefresh()
  const ago = useAgo()
  const core = preference.emulator.platform[rom.platform]?.core ?? ''
  const { saveFileType } = resolveConsole(rom.platform, core)
  const dateFormat = preference.ui.dateFormat === 'auto' ? dateFormatMap[i18n.language] : preference.ui.dateFormat
  const name = getRomGoodcodes(rom).rom

  const {
    data: versions = [],
    isLoading,
    mutate,
  } = useSWR({ core, endpoint: 'game_saves', rom: rom.id }, () =>
    parseResponse(client.game_saves.$get({ query: { core, rom: rom.id } })),
  )

  async function changed() {
    await mutate()
    // The game's page learns of the new save, so the next Start puts it in place
    await refresh()
  }

  const { isMutating: isRestoring, trigger: restore } = useSWRMutation(
    'game_saves/restore',
    async (_key, { arg: id }: { arg: string }) => {
      await client.game_saves[':id'].restore.$post({ param: { id } })
      await changed()
    },
  )

  const { isMutating: isUploading, trigger: upload } = useSWRMutation('game_saves/upload', async () => {
    const file = await fileOpen({ extensions: uploadExtensions })
    if (!file.size) {
      return
    }
    try {
      await client.game_saves.$post({ form: { core, file, fileType: saveFileType, rom: rom.id } })
    } catch {
      alert(t('error.failedToUploadSave'))
      return
    }
    await changed()
  })

  return (
    <Dialog.Content aria-describedby={undefined} maxWidth='480px'>
      <Dialog.Title>{t('emulator.inGameSave')}</Dialog.Title>

      {versions.length > 0 ? (
        <ul className='flex flex-col'>
          {versions.map((version, index) => (
            <li
              className='group flex h-12 items-center gap-3 border-t border-(--gray-4) px-1.5 text-sm'
              key={version.id}
            >
              <span className='flex-1'>
                {humanizeDate(version.createdAt, dateFormat)}
                <span className='ml-2 text-xs text-(--gray-10)'>{ago(version.createdAt)}</span>
              </span>
              {index === 0 ? (
                <span className='text-xs font-semibold text-(--accent-9)'>{t('emulator.inUse')}</span>
              ) : null}
              <span
                className={clsx(
                  'flex gap-1 transition-opacity',
                  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100',
                )}
              >
                <IconButton
                  aria-label={t('common.download')}
                  asChild
                  radius='full'
                  title={t('common.download')}
                  variant='ghost'
                >
                  <a download={`${name}.${version.fileId.split('.').pop()}`} href={getFileUrl(version.fileId)}>
                    <span className='icon-[mdi--download] size-4' />
                  </a>
                </IconButton>
                {index === 0 ? null : (
                  <IconButton
                    aria-label={t('emulator.restore')}
                    disabled={isRestoring}
                    onClick={() => restore(version.id)}
                    radius='full'
                    title={t('emulator.restore')}
                    variant='ghost'
                  >
                    <span className='icon-[mdi--backup-restore] size-4' />
                  </IconButton>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className='border-t border-(--gray-4) py-6 text-center text-sm text-(--gray-10)'>
          {isLoading ? <span className='icon-[svg-spinners--180-ring]' /> : t('emulator.noInGameSave')}
        </div>
      )}

      <div className='mt-4 flex justify-between'>
        <Button loading={isUploading} onClick={() => upload()} variant='soft'>
          <span className='icon-[mdi--upload]' />
          {t('common.upload')}
        </Button>
        <Dialog.Close>
          <Button variant='soft'>{t('common.close')}</Button>
        </Dialog.Close>
      </div>
    </Dialog.Content>
  )
}
