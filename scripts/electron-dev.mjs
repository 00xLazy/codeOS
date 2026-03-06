import { spawn } from 'child_process'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function waitForServer(port, retries = 40) {
  return new Promise((resolve, reject) => {
    let tries = 0
    const check = () => {
      http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) resolve()
        else retry()
      }).on('error', retry)
    }
    const retry = () => {
      if (++tries >= retries) return reject(new Error('server timeout'))
      setTimeout(check, 800)
    }
    check()
  })
}

// Build electron process first
console.log('Building Electron main process...')
await import('./build-electron.mjs')

// Start Next.js standalone server
console.log('Starting Next.js standalone server...')
const serverScript = path.join(root, '.next', 'standalone', 'server.js')
const nextProc = spawn(process.execPath, [serverScript], {
  cwd: path.join(root, '.next', 'standalone'),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: '3000',
    NODE_ENV: 'production',
    HOSTNAME: '127.0.0.1',
  },
})

nextProc.stdout.on('data', (d) => process.stdout.write(d))
nextProc.stderr.on('data', (d) => process.stderr.write(d))

// Wait for server to be ready
console.log('Waiting for Next.js...')
await waitForServer(3000)
console.log('Next.js ready.')

// Start Electron
console.log('Starting Electron...')
const electron = spawn('npx', ['electron', '.'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    CODEOS_PORT: '3000',
    CODEOS_DEV: '1',
  },
})

electron.on('close', () => {
  nextProc.kill()
  process.exit(0)
})

process.on('SIGINT', () => {
  nextProc.kill()
  electron.kill()
  process.exit(0)
})
