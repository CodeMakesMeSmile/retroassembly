import { drizzle } from 'drizzle-orm/better-sqlite3'
import { getDatabasePath } from '../../constants/env.ts'
import * as schema from '../../databases/schema.ts'

const config = { casing: 'snake_case', schema } as const

export function createDrizzle() {
  const library = drizzle(getDatabasePath(), config)
  return { library }
}
