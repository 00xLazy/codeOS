import type { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import type { FileNode } from '../src/types'

const IGNORE = new Set(['.git', 'node_modules', '.next', 'dist', 'dist-electron', '.DS_Store', '__pycache__', '.venv'])
const watchers = new Map<string, fs.FSWatcher>()

function readTree(dir: string, depth = 0): FileNode[] {
  if (depth > 4) return []
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => !IGNORE.has(e.name) && !e.name.startsWith('.'))
      .map((e) => {
        const fullPath = path.join(dir, e.name)
        if (e.isDirectory()) {
          return { name: e.name, path: fullPath, type: 'directory' as const, children: readTree(fullPath, depth + 1) }
        }
        return { name: e.name, path: fullPath, type: 'file' as const }
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
}

export function setupFileHandlers(ipcMain: IpcMain) {
  ipcMain.handle('fs:list', (_e, dir: string): FileNode[] => readTree(dir))

  ipcMain.handle('fs:read', (_e, filePath: string): string => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return ''
    }
  })

  ipcMain.handle('fs:readBase64', (_e, filePath: string): string => {
    try {
      return fs.readFileSync(filePath).toString('base64')
    } catch {
      return ''
    }
  })

  ipcMain.handle('fs:watch', (e, dir: string) => {
    if (watchers.has(dir)) return
    const w = fs.watch(dir, { recursive: true }, () => {
      e.sender.send(`fs:update:${dir}`)
    })
    watchers.set(dir, w)
  })

  ipcMain.handle('fs:unwatch', (_e, dir: string) => {
    watchers.get(dir)?.close()
    watchers.delete(dir)
  })
}
