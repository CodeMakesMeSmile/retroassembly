import type { PlatformName } from '#@/constants/platform.ts'
import type { LibraryScope } from '#@/utils/server/library-scope.ts'
import { updatePreference } from './update-preference.ts'

export async function deleteBIOS(scope: LibraryScope, platform: PlatformName, fileName: string) {
  const { preference } = scope

  const { bioses } = preference.emulator.platform[platform]

  return await updatePreference(scope, {
    emulator: {
      platform: {
        [platform]: {
          bioses: bioses.filter((bios) => bios.fileName !== fileName),
        },
      },
    },
  })
}
