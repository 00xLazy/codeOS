import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, AppSettings, PermissionDecision, SendMessageOpts, ContentBlock } from '../src/types'

function on(channel: string, cb: (...args: unknown[]) => void) {
  ipcRenderer.on(channel, (_e, ...args) => cb(...args))
  return () => ipcRenderer.removeAllListeners(channel)
}

const api: ElectronAPI = {
  // Window
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  onUpdateAvailable: (cb) => on('update:available', cb),
  onUpdateDownloaded: (cb) => on('update:downloaded', cb),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // Sessions
  getProjectSessions: (workDir) => ipcRenderer.invoke('sessions:byDir', workDir),
  getAllSessions: () => ipcRenderer.invoke('sessions:all'),
  hideSession: (id) => ipcRenderer.invoke('sessions:archive', id),
  renameSession: (id, title) => ipcRenderer.invoke('sessions:rename', id, title),
  markSessionDone: (id) => ipcRenderer.invoke('sessions:markDone', id),

  // Messages
  getSessionMessages: (sessionId) => ipcRenderer.invoke('messages:get', sessionId),
  sendClaudeMessage: (sessionId, content, opts) =>
    ipcRenderer.invoke('claude:send', sessionId, content, opts),
  stopClaude: (sessionId) => ipcRenderer.invoke('claude:stop', sessionId),
  onClaudeMessage: (sessionId, cb) => on(`claude:message:${sessionId}`, cb),
  truncateSessionAfter: (sessionId, messageId) =>
    ipcRenderer.invoke('messages:truncate', sessionId, messageId),
  cleanSessionThinking: (sessionId) =>
    ipcRenderer.invoke('messages:cleanThinking', sessionId),

  // Permissions
  claudeControl: (cb) => on('claude:permissionRequest', cb),
  claudeControlResponse: (id, decision) =>
    ipcRenderer.invoke('claude:permissionResponse', id, decision),

  // Directories
  getDirectories: () => ipcRenderer.invoke('dirs:get'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  removeDirectory: (dir) => ipcRenderer.invoke('dirs:remove', dir),
  reorderDirectories: (dirs) => ipcRenderer.invoke('dirs:reorder', dirs),

  // File system
  listDirectory: (dir, options) => ipcRenderer.invoke('fs:list', dir, options),
  readFile: (p) => ipcRenderer.invoke('fs:read', p),
  readFileBase64: (p) => ipcRenderer.invoke('fs:readBase64', p),
  startFileWatcher: (dir) => ipcRenderer.invoke('fs:watch', dir),
  stopFileWatcher: (dir) => ipcRenderer.invoke('fs:unwatch', dir),
  onFileTreeUpdate: (dir, cb) => on(`fs:update:${dir}`, cb),

  // Git
  gitStatus: (dir) => ipcRenderer.invoke('git:status', dir),
  gitLog: (dir, limit) => ipcRenderer.invoke('git:log', dir, limit),
  gitShow: (dir, hash) => ipcRenderer.invoke('git:show', dir, hash),
  gitDiff: (dir, hash) => ipcRenderer.invoke('git:diff', dir, hash),
  onGitStatusUpdate: (dir, cb) => on(`git:status:${dir}`, cb),

  // Checkpoint
  rollbackCheckpoint: (sessionId, messageId) =>
    ipcRenderer.invoke('checkpoint:rollback', sessionId, messageId),

  // Open in editor
  openInVSCode: (p) => ipcRenderer.invoke('shell:openInVSCode', p),
  openInCursor: (p) => ipcRenderer.invoke('shell:openInCursor', p),
  openInTerminal: (p) => ipcRenderer.invoke('shell:openInTerminal', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:showInFolder', p),

  // Settings
  getAllSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  onSettingsChanged: (cb) => on('settings:changed', cb),
  openSettings: () => ipcRenderer.invoke('settings:open'),

  // Providers
  getProviders: () => ipcRenderer.invoke('providers:get'),
  addProvider: (p) => ipcRenderer.invoke('providers:add', p),
  updateProvider: (id, p) => ipcRenderer.invoke('providers:update', id, p),
  deleteProvider: (id) => ipcRenderer.invoke('providers:delete', id),

  // Skills
  getProjectSkills: (projectDir) => ipcRenderer.invoke('skills:get', projectDir),
  setGlobalSkillEnabled: (skillId, enabled) =>
    ipcRenderer.invoke('skills:setEnabled', skillId, enabled),

  // Image picker
  pickImages: () => ipcRenderer.invoke('dialog:pickImages'),
}

contextBridge.exposeInMainWorld('electronAPI', api)
