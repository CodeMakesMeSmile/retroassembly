import fs from 'fs-extra'
import { getDirectories } from '../src/constants/env.ts'
import { exec } from './utils.ts'

async function main() {
  const { dataDirectory } = getDirectories()
  await Promise.all([exec`react-router typegen`, fs.ensureDir(dataDirectory)])
  await exec`drizzle-kit generate`
  await exec`drizzle-kit migrate`
}

await main()
