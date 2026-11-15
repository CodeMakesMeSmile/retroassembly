import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'fs-extra'
import isDocker from 'is-docker'
import { getDirectories } from '../../../constants/env.ts'
import { updateDiscGroups } from '../disc-groups.ts'
import { getDatabase } from '../drizzle.ts'

async function testDataDirectory() {
  const { dataDirectory } = getDirectories()
  const dataDirectoryExists = await fs.exists(dataDirectory)
  if (dataDirectoryExists) {
    return
  }

  const errorMessages = [`Data directory ${dataDirectory} does not exist.`]
  if (isDocker()) {
    errorMessages.push(
      `As you are using Docker, make sure to mount the data directory with "--volume <data_directory_path>:${dataDirectory}".`,
    )
  }
  for (const errorMessage of errorMessages) {
    console.error(errorMessage)
  }
  const errorMessage = errorMessages.join('\n')
  throw new Error(errorMessage)
}

function migrateDatabase() {
  const db = getDatabase().library
  migrate(db, {
    migrationsFolder: 'src/databases/migrations',
    migrationsSchema: 'src/databases/schema.ts',
  })
}

// Run before the server starts: checks the data directory is there and brings the database up to date
export async function initializeDatabase() {
  await testDataDirectory()
  migrateDatabase()
  updateDiscGroups(getDatabase().library)
}
