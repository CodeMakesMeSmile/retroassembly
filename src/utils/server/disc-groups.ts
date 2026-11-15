import { sql } from 'drizzle-orm'
import { consoles } from '#@/consoles/registry.ts'
import type { ConsoleDefinition } from '#@/consoles/types.ts'
import { parseDisc } from '#@/utils/isomorphic/discs.ts'
import type { getDatabase } from './drizzle.ts'

type Database = ReturnType<typeof getDatabase>['library']

const multiDiscPlatforms = new Set(
  Object.entries(consoles as Record<string, ConsoleDefinition>)
    .filter(([, { multiDisc }]) => multiDisc)
    .map(([name]) => name),
)

/** The disc group and number of a ROM, for a console whose games come on several discs */
export function getDiscFields(platform: string, fileName: string) {
  const disc = multiDiscPlatforms.has(platform) ? parseDisc(fileName) : undefined
  return { discGroup: disc?.group ?? null, discNumber: disc?.number ?? null }
}

/** Gives the ROMs uploaded before discs were grouped their disc group and number */
function assignDiscGroups(db: Database) {
  const platforms = [...multiDiscPlatforms]
  if (platforms.length === 0) {
    return
  }
  const rows = db.all<{ file_name: string; id: string; platform: string }>(sql`
    SELECT id, platform, file_name FROM roms
    WHERE disc_group IS NULL AND platform IN (${sql.join(
      platforms.map((platform) => sql`${platform}`),
      sql`, `,
    )})
  `)
  for (const { file_name: fileName, id, platform } of rows) {
    const { discGroup, discNumber } = getDiscFields(platform, fileName)
    if (discGroup) {
      db.run(sql`UPDATE roms SET disc_group = ${discGroup}, disc_number = ${discNumber} WHERE id = ${id}`)
    }
  }
}

/**
 * Moves each player's saves, favorites and play history from a game's other discs to the disc that stands for it (the
 * lowest-numbered one in the library), so the game has them all in one place. Saves keep which disc they were made on.
 */
function mergeDiscGroups(db: Database) {
  const others = db.all<{ disc_number: number; id: string; representative: string }>(sql`
    SELECT roms.id, roms.disc_number, (
      SELECT first.id FROM roms first
      WHERE first.user_id = roms.user_id AND first.platform = roms.platform AND first.disc_group = roms.disc_group
        AND first.status = 1
      ORDER BY first.disc_number, first.created_at LIMIT 1
    ) AS representative
    FROM roms
    WHERE roms.disc_group IS NOT NULL AND roms.status = 1
  `)
  for (const { disc_number: discNumber, id, representative } of others) {
    if (!representative || representative === id) {
      continue
    }
    db.run(sql`UPDATE states SET disc = coalesce(disc, ${discNumber}), rom_id = ${representative} WHERE rom_id = ${id}`)
    db.run(sql`UPDATE launch_records SET rom_id = ${representative} WHERE rom_id = ${id}`)
    // A player has at most one favorite per game: one on another disc is dropped if the game already has one
    db.run(sql`
      DELETE FROM favorites WHERE rom_id = ${id}
        AND user_id IN (SELECT user_id FROM favorites WHERE rom_id = ${representative})
    `)
    db.run(sql`UPDATE favorites SET rom_id = ${representative} WHERE rom_id = ${id}`)
  }
}

/** Groups discs uploaded before grouping existed, and keeps each game's saves, favorites and history together */
export function updateDiscGroups(db: Database) {
  assignDiscGroups(db)
  mergeDiscGroups(db)
}
