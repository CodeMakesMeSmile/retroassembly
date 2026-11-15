import path from 'node:path'
import { defaults } from 'es-toolkit/compat'

export function getRunTimeEnv() {
  const runTimeEnv = process.env

  return defaults(
    { ...runTimeEnv },
    {
      RETROASSEMBLY_RUN_TIME_ALLOW_CRAWLER: 'false',
      RETROASSEMBLY_RUN_TIME_DATA_DIRECTORY: path.resolve('data'),
      RETROASSEMBLY_RUN_TIME_MAX_AUTO_STATES_PER_ROM: '20',
      RETROASSEMBLY_RUN_TIME_MAX_ROM_COUNT: '',
      RETROASSEMBLY_RUN_TIME_MAX_ROM_COUNT_2026: '',
      RETROASSEMBLY_RUN_TIME_MAX_UPLOAD_AT_ONCE: '1000',
      RETROASSEMBLY_RUN_TIME_MSLEUTH_FALLBACK_HOST: 'https://msleuth.fly.dev/',
      RETROASSEMBLY_RUN_TIME_MSLEUTH_HOST: 'https://msleuth.arianrhodsandlot.workers.dev/',
      RETROASSEMBLY_RUN_TIME_OIDC_CLIENT_ID: '',
      RETROASSEMBLY_RUN_TIME_OIDC_CLIENT_SECRET: '',
      RETROASSEMBLY_RUN_TIME_OIDC_ISSUER: '',
      RETROASSEMBLY_RUN_TIME_OIDC_REDIRECT_URI: '',
      RETROASSEMBLY_RUN_TIME_OIDC_REQUIRED_ROLE: '',
      RETROASSEMBLY_RUN_TIME_OIDC_SCOPES: 'openid profile email',
      RETROASSEMBLY_RUN_TIME_OIDC_SESSION_MAX_AGE: '28800000',
      RETROASSEMBLY_RUN_TIME_SKIP_HOME: `${runTimeEnv.NODE_ENV !== 'development'}`,
      RETROASSEMBLY_RUN_TIME_SKIP_HOME_IF_LOGGED_IN: 'true',
      RETROASSEMBLY_RUN_TIME_STORAGE_DIRECTORY: path.resolve('data', 'storage'),
      RETROASSEMBLY_RUN_TIME_STORAGE_HOST: '',
      RETROASSEMBLY_RUN_TIME_SUPABASE_ANON_KEY: '',
      RETROASSEMBLY_RUN_TIME_SUPABASE_URL: '',
      RETROASSEMBLY_RUN_TIME_SUPERVISER_USER_IDS: '',
    },
  )
}

export function getDirectories() {
  const runTimeEnv = getRunTimeEnv()
  const dataDirectory = runTimeEnv.RETROASSEMBLY_RUN_TIME_DATA_DIRECTORY
  const storageDirectory = runTimeEnv.RETROASSEMBLY_RUN_TIME_STORAGE_DIRECTORY
  return { dataDirectory, storageDirectory }
}

export function getDatabasePath() {
  const { dataDirectory } = getDirectories()
  return path.join(dataDirectory, 'retroassembly.sqlite')
}
