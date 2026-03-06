import type { IpcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function setupUpdateHandlers(ipcMain: IpcMain, win: BrowserWindow | null) {
  autoUpdater.autoDownload = false

  ipcMain.handle('update:check', () => autoUpdater.checkForUpdates())
  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())

  autoUpdater.on('update-available', (info) => {
    win?.webContents.send('update:available', { version: info.version })
  })
  autoUpdater.on('update-downloaded', () => {
    win?.webContents.send('update:downloaded')
  })
}
