// ── Sessions ────────────────────────────────────────────────────
export interface ChatSession {
  id: string
  title: string
  workDir: string
  model: string
  mode: 'code' | 'plan' | 'ask'
  createdAt: number
  updatedAt: number
  archived: boolean
  tokenCount: number
  cost: number
}

// ── Messages ─────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system'

export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  mediaType: string
  data: string // base64
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultContent {
  type: 'tool_result'
  toolUseId: string
  content: string | TextContent[]
  isError?: boolean
}

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
}

export type ContentBlock =
  | TextContent
  | ImageContent
  | ToolUseContent
  | ToolResultContent
  | ThinkingContent

export interface Message {
  id: string
  sessionId: string
  role: MessageRole
  content: ContentBlock[]
  createdAt: number
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  model?: string
}

// ── Permissions ───────────────────────────────────────────────────
export type PermissionDecision = 'allow' | 'deny' | 'always_allow'

export interface PermissionRequest {
  id: string
  sessionId: string
  toolName: string
  toolInput: Record<string, unknown>
  timestamp: number
}

// ── Providers ─────────────────────────────────────────────────────
export type ProviderType = 'anthropic' | 'openai' | 'google' | 'custom'

export interface ApiProvider {
  id: string
  name: string
  type: ProviderType
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  isDefault: boolean
  createdAt: number
}

// ── Skills ────────────────────────────────────────────────────────
export type SkillScope = 'global' | 'project'

export interface Skill {
  id: string
  name: string
  description?: string
  prompt: string
  scope: SkillScope
  projectDir?: string
  createdAt: number
  updatedAt: number
}

// ── MCP Servers ───────────────────────────────────────────────────
export type McpTransport = 'stdio' | 'sse' | 'http'

export interface McpServer {
  id: string
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  enabled: boolean
  createdAt: number
}

// ── Tasks ─────────────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface Task {
  id: string
  sessionId: string
  title: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
}

// ── Settings ──────────────────────────────────────────────────────
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'zh' | 'en'
  defaultModel: string
  autoScroll: boolean
  showTimestamps: boolean
  autoApprove: boolean
  fontSize: 'sm' | 'md' | 'lg'
}

// ── Git ───────────────────────────────────────────────────────────
export interface GitStatus {
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: string[]
  branch: string
  ahead: number
  behind: number
}

export interface GitFileStatus {
  path: string
  status: 'M' | 'A' | 'D' | 'R' | 'C' | '?'
}

export interface GitCommit {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
  refs?: string
}

// ── Checkpoint ────────────────────────────────────────────────────
export interface Checkpoint {
  id: string
  sessionId: string
  messageId: string
  snapshotPath: string
  createdAt: number
}

// ── Usage ─────────────────────────────────────────────────────────
export interface UsageStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheCreationTokens: number
  totalCacheReadTokens: number
  totalCost: number
  sessionCount: number
  dailyUsage: DailyUsage[]
}

export interface DailyUsage {
  date: string
  inputTokens: number
  outputTokens: number
  cost: number
}

// ── Electron API (contextBridge) ──────────────────────────────────
export interface ElectronAPI {
  // Window
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<void>
  onUpdateAvailable: (cb: (info: { version: string }) => void) => () => void
  onUpdateDownloaded: (cb: () => void) => () => void
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>

  // Sessions
  getProjectSessions: (workDir: string) => Promise<ChatSession[]>
  getAllSessions: () => Promise<ChatSession[]>
  hideSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  markSessionDone: (id: string) => Promise<void>

  // Messages
  getSessionMessages: (sessionId: string) => Promise<Message[]>
  sendClaudeMessage: (sessionId: string, content: ContentBlock[], opts: SendMessageOpts) => Promise<void>
  stopClaude: (sessionId: string) => Promise<void>
  onClaudeMessage: (sessionId: string, cb: (msg: Message) => void) => () => void
  truncateSessionAfter: (sessionId: string, messageId: string) => Promise<void>
  cleanSessionThinking: (sessionId: string) => Promise<void>

  // Permissions
  claudeControl: (cb: (req: PermissionRequest) => void) => () => void
  claudeControlResponse: (id: string, decision: PermissionDecision) => Promise<void>

  // Directories
  getDirectories: () => Promise<string[]>
  openDirectory: () => Promise<string | null>
  removeDirectory: (dir: string) => Promise<void>
  reorderDirectories: (dirs: string[]) => Promise<void>

  // File system
  listDirectory: (dir: string, options?: { showHidden?: boolean }) => Promise<FileNode[]>
  readFile: (path: string) => Promise<string>
  readFileBase64: (path: string) => Promise<string>
  startFileWatcher: (dir: string) => Promise<void>
  stopFileWatcher: (dir: string) => Promise<void>
  onFileTreeUpdate: (dir: string, cb: () => void) => () => void

  // Git
  gitStatus: (dir: string) => Promise<GitStatus>
  gitLog: (dir: string, limit?: number) => Promise<GitCommit[]>
  gitShow: (dir: string, hash: string) => Promise<string>
  gitDiff: (dir: string, hash?: string) => Promise<string>
  onGitStatusUpdate: (dir: string, cb: (status: GitStatus) => void) => () => void

  // Checkpoint
  rollbackCheckpoint: (sessionId: string, messageId: string) => Promise<void>

  // Open in editor
  openInVSCode: (path: string) => Promise<void>
  openInCursor: (path: string) => Promise<void>
  openInTerminal: (path: string) => Promise<void>
  showInFolder: (path: string) => Promise<void>

  // Settings
  getAllSettings: () => Promise<AppSettings>
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  onSettingsChanged: (cb: (settings: AppSettings) => void) => () => void
  openSettings: () => Promise<void>

  // Providers
  getProviders: () => Promise<ApiProvider[]>
  addProvider: (p: Omit<ApiProvider, 'id' | 'createdAt'>) => Promise<ApiProvider>
  updateProvider: (id: string, p: Partial<ApiProvider>) => Promise<void>
  deleteProvider: (id: string) => Promise<void>

  // Skills
  getProjectSkills: (projectDir: string) => Promise<Skill[]>
  setGlobalSkillEnabled: (skillId: string, enabled: boolean) => Promise<void>

  // Image picker
  pickImages: () => Promise<string[]>
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  gitStatus?: 'M' | 'A' | 'D' | '?'
}

export interface SendMessageOpts {
  model: string
  mode: 'code' | 'plan' | 'ask'
  workDir: string
  checkpointEnabled?: boolean
}
