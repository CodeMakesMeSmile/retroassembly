import type { Config } from '@react-router/dev/config'
import { $ } from 'execa'
import fs from 'fs-extra'

export default {
  appDirectory: 'src/pages',
  buildDirectory: 'dist',
  async buildEnd() {
    await $({ stderr: 'inherit', stdout: 'inherit' })`vp pack`
    await fs.move('dist/scripts', 'dist/server', { overwrite: true })
  },
} satisfies Config
