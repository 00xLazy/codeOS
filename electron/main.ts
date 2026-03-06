import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  nativeTheme,
} from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import fs from 'fs'
import * as db from './db-main'
import { setupClaudeHandlers } from './claude-handlers'
import { setupFileHandlers } from './file-handlers'
import { setupGitHandlers } from './git-handlers'
import { setupUpdateHandlers } from './update-handlers'

let mainWindow: BrowserWindow | null = null
let nextServer: ChildProcess | null = null
let serverPort = 3000

async function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const srv = http.createServer()
    srv.listen(start, () => {
      const addr = srv.address() as { port: number }
      srv.close(() => resolve(addr.port))
    })
    srv.on('error', () => resolve(findFreePort(start + 1)))
  })
}

async function waitForServer(port: number, retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
          if (res.statusCode === 200) resolve()
          else reject(new Error(`status ${res.statusCode}`))
        }).on('error', reject)
      })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error('Next.js server did not start')
}

function startNextServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged
    const serverScript = isDev
      ? path.join(process.cwd(), 'node_modules/.bin/next')
      : path.join(process.resourcesPath, 'standalone', 'server.js')

    const args = isDev ? ['start', '--port', String(port)] : []
    const cwd = isDev ? process.cwd() : path.join(process.resourcesPath, 'standalone')
    const env = { ...process.env, PORT: String(port), CODEOS_DATA_DIR: getDataDir() }

    nextServer = spawn(isDev ? serverScript : process.execPath, args, {
      cwd,
      env,
      stdio: 'pipe',
    })

    nextServer.stdout?.on('data', (d: Buffer) => {
      const text = d.toString()
      if (text.includes('started server') || text.includes('ready')) resolve()
    })
    nextServer.stderr?.on('data', (d: Buffer) => process.stderr.write(d))
    nextServer.on('error', reject)
    nextServer.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`Next.js exited with ${code}`))
    })

    setTimeout(resolve, 3000)
  })
}

function getDataDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || app.getPath('home')
  return app.isPackaged ? path.join(home, '.codeos') : path.join(process.cwd(), 'data')
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = null })

  await mainWindow.loadURL(`http://127.0.0.1:${serverPort}`)

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

async function main() {
  serverPort = await findFreePort(3000)

  await startNextServer(serverPort)
  await waitForServer(serverPort).catch(() => {})

  db.init(getDataDir())
  process.env.CODEOS_PORT = String(serverPort)

  setupClaudeHandlers(ipcMain, () => mainWindow)
  setupFileHandlers(ipcMain)
  setupGitHandlers(ipcMain)
  setupUpdateHandlers(ipcMain, mainWindow)

  // ── Window controls ──────────────────────────────────────────────
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())

  // ── App info ─────────────────────────────────────────────────────
  ipcMain.handle('app:version', () => app.getVersion())

  // ── Directory picker ─────────────────────────────────────────────
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:pickImages', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })
    return result.canceled ? [] : result.filePaths
  })

  // ── Shell open ───────────────────────────────────────────────────
  ipcMain.handle('shell:openInVSCode', (_e, p: string) =>
    shell.openExternal(`vscode://file/${p}`)
  )
  ipcMain.handle('shell:openInCursor', (_e, p: string) =>
    shell.openExternal(`cursor://file/${p}`)
  )
  ipcMain.handle('shell:openInTerminal', (_e, p: string) => {
    spawn('open', ['-a', 'Terminal', p])
  })
  ipcMain.handle('shell:showInFolder', (_e, p: string) => shell.showItemInFolder(p))

  await createWindow()
}

app.whenReady().then(main)

app.on('window-all-closed', () => {
  nextServer?.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  nextServer?.kill()
})
