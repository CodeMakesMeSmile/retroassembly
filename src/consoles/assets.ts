// The one copy of the versions of the files emulators need from the CDN. Emulator addresses, the offline cache's
// allowlist and the offline downloader all read from here, so they can't disagree

/** Emulators from the RetroArch Emscripten build, on GitHub */
export const retroarchBuild = { repository: 'arianrhodsandlot/retroarch-emscripten-build', version: 'v1.22.2-1' }

/** Emulators built for this fork, on npm */
export const customCoresPackage = { name: 'retroassembly-custom-cores', version: '1.22.2-20260719172358' }

/** Shaders, on GitHub */
export const shadersRepository = {
  repository: 'libretro/glsl-shaders',
  version: '468f67b6f6788e2719d1dd28dfb2c9b7c3db3cc7',
}
