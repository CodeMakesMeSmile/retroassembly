// A game on several discs is uploaded as one file per disc, named the No-Intro way: "Chrono Cross (USA) (Disc 1).chd".
// The name before "(Disc N)" is the game; anything after it, such as "(Evolution Disc)", only describes that disc
const discPattern = /^(?<group>.+?) \((?:Disc|Disk|CD) (?<number>\d+)(?: of \d+)?\)/iu

export function parseDisc(fileName: string) {
  const match = discPattern.exec(fileName)
  if (!match?.groups) {
    return
  }
  return { group: match.groups.group.trim(), number: Number(match.groups.number) }
}

/** The disc list the emulator reads to play a game's discs as one, in disc order */
export function createDiscList(fileNames: string[]) {
  return `${fileNames.join('\n')}\n`
}
