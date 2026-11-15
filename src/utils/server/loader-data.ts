import { getContext } from 'hono/context-storage'
import { getRunTimeEnv } from '#@/constants/env.ts'
import { getLaunchRecords } from '#@/controllers/launch-records/get-launch-records.ts'
import { getAuthMode } from '#@/utils/server/auth.ts'

/* Used for non-library routes */
export function getCommonLoaderData<T>(data: T = {} as T) {
  const c = getContext()
  const { currentUser, detectedLanguage, language, preference } = c.var
  const runTimeEnv = getRunTimeEnv()
  const env = {
    RETROASSEMBLY_RUN_TIME_MAX_AUTO_STATES_PER_ROM: runTimeEnv.RETROASSEMBLY_RUN_TIME_MAX_AUTO_STATES_PER_ROM,
    RETROASSEMBLY_RUN_TIME_MAX_ROM_COUNT: runTimeEnv.RETROASSEMBLY_RUN_TIME_MAX_ROM_COUNT,
    RETROASSEMBLY_RUN_TIME_MAX_UPLOAD_AT_ONCE: runTimeEnv.RETROASSEMBLY_RUN_TIME_MAX_UPLOAD_AT_ONCE,
  }
  const isLikelyDesktop = c.req.header('sec-ch-ua-mobile') !== '?1'

  return {
    authMode: getAuthMode(),
    currentUser,
    detectedLanguage,
    env,
    isLikelyDesktop,
    language,
    preference,
    title: '',
    ...data,
  }
}

/* Used for routes under /library and needing recently launched ROMs */
export async function getLibraryLoaderData<T>(data: T = {} as T) {
  const { roms: recentlyLaunchedRoms } = await getLaunchRecords({ pageSize: 20 })
  return getCommonLoaderData({ ...data, recentlyLaunchedRoms })
}
