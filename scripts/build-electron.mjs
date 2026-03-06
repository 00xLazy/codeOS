import { execSync } from 'child_process'
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

await build({
  entryPoints: [
    path.join(root, 'electron/main.ts'),
    path.join(root, 'electron/preload.ts'),
  ],
  outdir: path.join(root, 'dist-electron'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron', 'better-sqlite3'],
  format: 'cjs',
  sourcemap: true,
  minify: false,
})

console.log('Electron main process built.')
