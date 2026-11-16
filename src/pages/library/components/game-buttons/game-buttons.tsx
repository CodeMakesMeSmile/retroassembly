import { Button, HoverCard } from '@radix-ui/themes'
import { clsx } from 'clsx'
import { noop } from 'es-toolkit'
import { type MouseEvent, useEffect, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { generatePath, useLoaderData, useLocation, useNavigate } from 'react-router'
import { platformMap } from '#@/constants/platform.ts'
import { useLaunchButton } from '#@/pages/library/atoms.ts'
import { useSession } from '#@/pages/library/components/emulator-portal/emulator-session-provider.tsx'
import { useFocusIndicator } from '#@/pages/library/hooks/use-focus-indicator.ts'
import { usePreference } from '#@/pages/library/hooks/use-preference.ts'
import { DownloadError } from '#@/pages/library/utils/download.ts'
import { getFileUrl } from '#@/pages/library/utils/file.ts'
import type { LoadingProgress } from '#@/pages/library/utils/loading-progress.ts'
import { routes } from '#@/pages/routes.ts'
import { formatBytes } from '#@/utils/client/format-bytes.ts'
import { needsCrossOriginIsolation } from '#@/utils/isomorphic/cross-origin-isolation.ts'
import { LaunchButton, type LaunchButtonProgress } from '../../platform/rom/components/launch-button.tsx'
import { EmulatorPortal } from '../emulator-portal/emulator-portal.tsx'
import { EmulatorSessionProvider } from '../emulator-portal/emulator-session-provider.tsx'
import { BioseMissingMessage } from './biose-missing-message.tsx'

const isAppleMobile = /iphone|ipad|ipod/iu.test(navigator.userAgent)
const isChromeLike = /chrome/iu.test(navigator.userAgent)
const isMacLike = /macintosh/iu.test(navigator.userAgent)
const isAppleMobileDesktopMode =
  !isChromeLike && isMacLike && /safari/iu.test(navigator.userAgent) && screen.height <= 1366
const mayNeedsUserInteraction = isAppleMobile || isAppleMobileDesktopMode

function subscribeNever() {
  return noop
}

export function GameButtons({ lazy = false }: Readonly<{ lazy?: boolean }>) {
  const { rom } = useLoaderData()
  const { t } = useTranslation()

  const platformName = t(platformMap[rom.platform].displayNameI18nKey)

  return (
    <EmulatorSessionProvider lazy={lazy}>
      <div>
        <GameButtonsContent />
        {['psx', 'n64', 'nds', 'psp'].includes(rom.platform) ? (
          <div className='mt-1 text-sm opacity-60'>
            {t('platform.emulationExperimental', { platform: platformName })}
          </div>
        ) : null}
      </div>
    </EmulatorSessionProvider>
  )
}

function GameButtonsContent() {
  const { rom, state } = useLoaderData()
  const { i18n, t } = useTranslation()
  const { error: prepareError, isDownloading, isPreparing, launch, loadingProgress, prepare, warmUp } = useSession()
  // Which button was pressed, while its game loads, and whether it's taken long enough to show how far it's got.
  // Loads under half a second show nothing, so a small game doesn't flash anything up
  const [pressed, setPressed] = useState<'continue' | 'start'>()
  const [progressShown, setProgressShown] = useState(false)
  const [launchError, setLaunchError] = useState<unknown>()
  const error = prepareError ?? launchError
  useEffect(() => {
    if (!pressed) {
      return
    }
    const timer = setTimeout(() => setProgressShown(true), 500)
    return () => clearTimeout(timer)
  }, [pressed])

  async function launchFrom(button: 'continue' | 'start', withState: boolean) {
    setPressed(button)
    setLaunchError(undefined)
    try {
      await launch({ withState })
    } catch (error) {
      setLaunchError(error)
    } finally {
      setPressed(undefined)
      setProgressShown(false)
    }
  }

  function describe(progress: LoadingProgress): LaunchButtonProgress {
    if (progress.step === 'starting') {
      return { detail: t('emulator.almostThere'), label: t('emulator.starting') }
    }
    const values = {
      loaded: formatBytes(progress.loaded ?? 0, i18n.language),
      total: progress.total === undefined ? '' : formatBytes(progress.total, i18n.language),
    }
    const detail =
      progress.total === undefined
        ? t(`emulator.loadingStepSoFar.${progress.step}`, values)
        : t(`emulator.loadingStep.${progress.step}`, values)
    return { detail, fraction: progress.fraction, label: t('emulator.loading') }
  }
  const progress = progressShown ? describe(loadingProgress) : undefined
  const [, setLaunchButton] = useLaunchButton()
  const { syncStyle } = useFocusIndicator()
  const { preference } = usePreference()

  const { bioses } = preference.emulator.platform[rom.platform]

  // A game whose emulator runs on several threads (the PSP's) only starts on its own page, which is cross-origin isolated.
  // From anywhere else, Start opens that page; on it, a browser that couldn't isolate it is told so
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const gamePage = generatePath(routes.libraryPlatformRom, { fileName: rom.fileName, platform: rom.platform })
  const needsIsolation = needsCrossOriginIsolation(gamePage)
  const isolated = useSyncExternalStore(
    subscribeNever,
    () => globalThis.crossOriginIsolated,
    () => true,
  )
  const awayFromGamePage = needsIsolation && !needsCrossOriginIsolation(pathname)
  const cannotIsolate = needsIsolation && !awayFromGamePage && !isolated

  const expectedBioses = platformMap[rom.platform].bioses
  const missingBioses = expectedBioses?.filter(
    (bios) => bios.required && !bioses?.some((b) => b.fileName === bios.name),
  )

  function handleClickCommon(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget
    if (button) {
      setLaunchButton(button)
      button.blur()
      syncStyle()
    }
  }

  async function handleClickContinue(event: MouseEvent<HTMLButtonElement>) {
    if (isPreparing || (mayNeedsUserInteraction && !event?.clientX && !event?.clientY)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (awayFromGamePage) {
      await navigate(gamePage)
      return
    }
    handleClickCommon(event)
    await launchFrom('continue', true)
  }

  async function handleClickStart(event: MouseEvent<HTMLButtonElement>) {
    if (isPreparing || (mayNeedsUserInteraction && !event?.clientX && !event?.clientY)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (awayFromGamePage) {
      await navigate(gamePage)
      return
    }
    handleClickCommon(event)
    await launchFrom('start', false)
  }

  // The game starts downloading as soon as the player reaches for Start with a mouse or finger, so it's usually ready by
  // the time it's pressed. Focus doesn't count: Start is focused as soon as the page opens
  const warmUpHandlers = awayFromGamePage ? {} : { onPointerDown: warmUp, onPointerEnter: warmUp }

  async function handleClickRetry() {
    setLaunchError(undefined)
    if (!isPreparing) {
      await prepare()
    }
  }

  if (missingBioses?.length) {
    return <BioseMissingMessage bioses={missingBioses} />
  }

  if (cannotIsolate) {
    return (
      <div className='flex min-h-16 w-full items-center justify-center gap-2 rounded bg-(--accent-3) p-3 lg:w-80'>
        <span className='icon-[mdi--warning-decagram] shrink-0' />
        <span className='text-sm opacity-60'>
          {t('error.browserCannotRunPlatform', { platform: t(platformMap[rom.platform].displayNameI18nKey) })}
        </span>
      </div>
    )
  }

  if (!isPreparing && error) {
    return (
      <div className='flex h-16 w-full items-center justify-center gap-2 rounded bg-(--accent-3) lg:w-80'>
        <span className='icon-[mdi--warning-decagram]' />
        <span className='text-sm opacity-60'>
          {error instanceof DownloadError ? t(`error.failedToDownload.${error.kind}`) : t('error.failedToLoadEmulator')}
        </span>
        <Button onClick={handleClickRetry} size='1' type='button'>
          <span className='icon-[mdi--reload]' />
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex w-full flex-col gap-4 xl:flex-row'>
      {state ? (
        <LaunchButton
          disabled={isPreparing}
          onClick={handleClickContinue}
          progress={pressed === 'continue' ? progress : undefined}
          {...warmUpHandlers}
        >
          <span
            className={clsx(
              'absolute left-10',
              isPreparing || isDownloading
                ? 'icon-[svg-spinners--180-ring]'
                : [
                    'size-6',
                    mayNeedsUserInteraction ? 'icon-[mdi--gesture-touch]' : 'icon-[mdi--arrow-u-right-top-bold]',
                  ],
            )}
          />
          <span className='flex-1 text-2xl font-semibold'>{t('common.continue')}</span>
          <HoverCard.Root>
            <HoverCard.Trigger>
              <img
                alt={t('common.state')}
                className='absolute right-3 size-10 rounded-sm border-2 border-white bg-neutral-200 object-cover shadow'
                src={getFileUrl(state.thumbnailFileId)}
              />
            </HoverCard.Trigger>
            <HoverCard.Content align='center' hideWhenDetached side='top' size='1'>
              <img
                alt={t('common.state')}
                className='size-48 cursor-pointer rounded-sm border-2 border-white bg-neutral-200 object-cover shadow'
                src={getFileUrl(state.thumbnailFileId)}
              />
            </HoverCard.Content>
          </HoverCard.Root>
        </LaunchButton>
      ) : null}

      <LaunchButton
        disabled={isPreparing}
        onClick={handleClickStart}
        progress={pressed === 'start' ? progress : undefined}
        variant={state ? 'outline' : 'solid'}
        {...warmUpHandlers}
      >
        <span
          className={clsx(
            'absolute left-10',
            isPreparing || isDownloading
              ? 'icon-[svg-spinners--180-ring]'
              : ['size-6', mayNeedsUserInteraction ? 'icon-[mdi--gesture-touch]' : 'icon-[mdi--play]'],
          )}
        />
        <span className='flex-1 text-2xl font-semibold'>{t('emulator.start')}</span>
      </LaunchButton>

      <EmulatorPortal />
    </div>
  )
}
