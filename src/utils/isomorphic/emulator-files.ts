import { customCoresPackage, retroarchBuild, shadersRepository } from '../../consoles/assets.ts'
import { type CoreName, emulators } from '../../consoles/emulators.ts'
import { cdnHost } from './cdn.ts'

function getSource(core: string) {
  return emulators[core as CoreName]?.source
}

// Cores built for this fork and shipped with the app, from src/assets/cores; the page gets their addresses from
// bundled-cores.ts, since only the browser build can give them fingerprinted addresses
export function isBundledCore(core: string) {
  return getSource(core) === 'bundled'
}

export function getCoreUrl(core: string) {
  const segments =
    getSource(core) === 'custom'
      ? ['npm', `${customCoresPackage.name}@${customCoresPackage.version}`, 'dist', 'cores', `${core}_libretro.zip`]
      : ['gh', `${retroarchBuild.repository}@${retroarchBuild.version}`, 'retroarch', `${core}_libretro.zip`]
  return new URL(segments.join('/'), cdnHost).href
}

const shaderPrefix = new URL(`gh/${shadersRepository.repository}@${shadersRepository.version}`, cdnHost).href

const shaderFiles: Record<string, string[]> = {
  'crt/crt-easymode-halation': [
    'crt/shaders/crt-easymode-halation/linearize.glsl',
    'crt/shaders/crt-easymode-halation/blur_horiz.glsl',
    'crt/shaders/crt-easymode-halation/blur_vert.glsl',
    'crt/shaders/crt-easymode-halation/threshold.glsl',
    'crt/shaders/crt-easymode-halation/crt-easymode-halation.glsl',
  ],
  'crt/crt-hyllian': ['crt/shaders/zfast_crt.glsl'],
  'crt/crt-interlaced-halation': [
    'crt/shaders/crt-interlaced-halation/crt-interlaced-halation-pass0.glsl',
    'crt/shaders/crt-interlaced-halation/crt-interlaced-halation-pass1.glsl',
    'crt/shaders/crt-interlaced-halation/crt-interlaced-halation-pass2.glsl',
    'interpolation/shaders/quilez.glsl',
  ],
  'crt/zfast-crt': ['crt/shaders/zfast_crt.glsl'],
  'deblur/sedi': ['deblur/shaders/sedi-v1.0.glsl'],
  'handheld/gba-color': ['handheld/shaders/color/gba-color.glsl'],
  'handheld/vba-color': ['handheld/shaders/color/vba-color.glsl'],
  'handheld/zfast-lcd': ['handheld/shaders/zfast_lcd.glsl'],
  'sabr/sabr': ['sabr/shaders/sabr-v3.0.glsl'],
}

/** The preset followed by the shader files for a shader from libretro/glsl-shaders, e.g. `crt/crt-geom`. */
export function getShaderUrls(name?: string) {
  if (!name) {
    return []
  }
  const segments = name.split('/')
  segments.splice(-1, 0, 'shaders')
  const files = shaderFiles[name] || [`${segments.join('/')}.glsl`]
  return [`${name}.glslp`, ...files].map((file) => `${shaderPrefix}/${file}`)
}
