import { spawn } from 'child_process'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function waitForNext(port, retries = 30) {
  return new Promise((resolve, reject) => {
    let tries = 0
    const check = () => {
      http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) resolve()
        else retry()
      }).on('error', retry)
    }
    const retry = () => {
      if (++tries >= retries) return reject(new Error('timeout'))
      setTimeout(check, 1000)
    }
    check()
  })
}

// Build electron process first
console.log('Building Electron main process...')
await import('./build-electron.mjs')

// Start Next.js dev server
console.log('Starting Next.js...')
const next = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' },
})

// Wait for Next.js to be ready
console.log('Waiting for Next.js...')
await waitForNext(3000)
console.log('Next.js ready.')

// Start Electron
console.log('Starting Electron...')
const electron = spawn('npx', ['electron', '.'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
})

electron.on('close', () => {
  next.kill()
  process.exit(0)
})

process.on('SIGINT', () => {
  next.kill()
  electron.kill()
  process.exit(0)
})
