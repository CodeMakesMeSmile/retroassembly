import desmume2015 from '#@/assets/cores/desmume2015_libretro.zip?url'
import ppssppAssets from '#@/assets/cores/ppsspp_assets.zip?url'
import ppsspp from '#@/assets/cores/ppsspp_libretro.zip?url'

// Addresses of the cores shipped with the app. The build names each file after a fingerprint of its contents, so a
// browser can keep it for good and still pick up a new build of it at its new address
export const bundledCoreUrls: Partial<Record<string, string>> = { desmume2015, ppsspp }

/**
 * Files a core needs besides the game, shipped with the app as a zip and put in RetroArch's system folder, under
 * `folder`, before each launch: PPSSPP's fonts and dialog graphics, from its own repository
 */
export const bundledSystemFiles: Partial<Record<string, { folder: string; url: string }>> = {
  ppsspp: { folder: 'PPSSPP', url: ppssppAssets },
}
