"""After linking PPSSPP: each pthread worker is started from the emulator's own file. Built as an ES module, it finds
that file next to itself (import.meta.url), but Nostalgist runs it from a blob, where a relative address can't be
resolved. Nostalgist's locateFile maps the file's name to that blob, so the workers ask it first."""
import sys
path = sys.argv[1]
source = open(path).read()
old = 'new URL("ppsspp_libretro.js",import.meta.url)'
if source.count(old) != 1:
    sys.exit(f'expected one worker URL in {path}, found {source.count(old)}')
source = source.replace(old, '(Module["locateFile"]?Module["locateFile"]("ppsspp_libretro.js",""):' + old + ')')
open(path, 'w').write(source)
