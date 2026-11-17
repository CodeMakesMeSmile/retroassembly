import { Hono } from 'hono'
import { requireUser } from '#@/middlewares/require-user.ts'
import { diagnostics } from './diagnostics.ts'
import { favorites } from './favorites.ts'
import { files } from './files.ts'
import { gameSaves } from './game-saves.ts'
import { launchRecords } from './launch-records.ts'
import { preference } from './preference.ts'
import { roms } from './roms.ts'
import { states } from './states.ts'

export const app = new Hono()
  .use(requireUser())
  .route('diagnostics', diagnostics)
  .route('favorites', favorites)
  .route('files', files)
  .route('game_saves', gameSaves)
  .route('launch_records', launchRecords)
  .route('preference', preference)
  .route('roms', roms)
  .route('states', states)
