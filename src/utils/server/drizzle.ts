import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { getDatabasePath } from '../../constants/env.ts'
import * as schema from '../../databases/schema.ts'

const config = { casing: 'snake_case', schema } as const

function openDatabase() {
  const sqlite = new Database(getDatabasePath())
  // A backup or a script may hold the file for a moment; wait for it rather than failing the request
  sqlite.pragma('busy_timeout = 5000')
  return { library: drizzle({ client: sqlite, ...config }) }
}

let database: ReturnType<typeof openDatabase> | undefined

// The one connection to the database, opened on first use and shared by every request and background job
export function getDatabase() {
  database ??= openDatabase()
  return database
}
