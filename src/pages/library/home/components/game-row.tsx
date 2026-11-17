import { GameEntry } from '../../components/game-entry/game-entry.tsx'

/** Games in one of Home's rows, each with an optional note under it, such as how many can play */
export function GameRow({ note, roms }: Readonly<{ note?: (rom: any) => string | undefined; roms: any[] }>) {
  return roms.map((rom) => (
    <div className='w-28 shrink-0 lg:w-36' key={rom.id}>
      <GameEntry rom={rom} />
      {note?.(rom) ? (
        <div className='-mt-5 text-center'>
          <span className='rounded-full bg-(--accent-3) px-2 text-xs text-(--accent-11)'>{note(rom)}</span>
        </div>
      ) : null}
    </div>
  ))
}
