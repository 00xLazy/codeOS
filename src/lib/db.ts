import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type {
  ChatSession,
  Message,
  ApiProvider,
  Skill,
  McpServer,
  Task,
  AppSettings,
  Checkpoint,
} from '@/types'

function getDbPath(): string {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return path.join(process.cwd(), 'data', 'codeos.db')
  }
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return path.join(home, '.codeos', 'codeos.db')
}

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  migrate(_db)
  return _db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      work_dir TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT 'claude-opus-4-6',
      mode TEXT NOT NULL DEFAULT 'code',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      token_count INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cache_creation_tokens INTEGER,
      cache_read_tokens INTEGER,
      model TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      api_key TEXT NOT NULL DEFAULT '',
      base_url TEXT,
      default_model TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'global',
      project_dir TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      transport TEXT NOT NULL DEFAULT 'stdio',
      command TEXT,
      args TEXT,
      url TEXT,
      env TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      message_id TEXT NOT NULL,
      snapshot_path TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_work_dir ON chat_sessions(work_dir, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
  `)
}

// ── Sessions ────────────────────────────────────────────────────────
export function getAllSessions(): ChatSession[] {
  return getDb()
    .prepare(`SELECT * FROM chat_sessions WHERE archived = 0 ORDER BY updated_at DESC`)
    .all()
    .map(rowToSession)
}

export function getSessionsByDir(workDir: string): ChatSession[] {
  return getDb()
    .prepare(`SELECT * FROM chat_sessions WHERE work_dir = ? AND archived = 0 ORDER BY updated_at DESC`)
    .all(workDir)
    .map(rowToSession)
}

export function getSession(id: string): ChatSession | null {
  const row = getDb().prepare(`SELECT * FROM chat_sessions WHERE id = ?`).get(id)
  return row ? rowToSession(row) : null
}

export function createSession(session: ChatSession): void {
  getDb()
    .prepare(`
      INSERT INTO chat_sessions (id, title, work_dir, model, mode, created_at, updated_at, archived, token_count, cost)
      VALUES (@id, @title, @workDir, @model, @mode, @createdAt, @updatedAt, 0, 0, 0)
    `)
    .run({ ...session, workDir: session.workDir })
}

export function updateSession(id: string, data: Partial<ChatSession>): void {
  const fields = Object.keys(data)
    .map((k) => `${toSnake(k)} = @${k}`)
    .join(', ')
  getDb()
    .prepare(`UPDATE chat_sessions SET ${fields}, updated_at = @updatedAt WHERE id = @id`)
    .run({ ...(data as Record<string, unknown>), updatedAt: Date.now(), id })
}

export function archiveSession(id: string): void {
  getDb().prepare(`UPDATE chat_sessions SET archived = 1 WHERE id = ?`).run(id)
}

// ── Messages ────────────────────────────────────────────────────────
export function getMessages(sessionId: string): Message[] {
  return getDb()
    .prepare(`SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC`)
    .all(sessionId)
    .map(rowToMessage)
}

export function insertMessage(msg: Message): void {
  getDb()
    .prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, model)
      VALUES (@id, @sessionId, @role, @content, @createdAt, @inputTokens, @outputTokens, @cacheCreationTokens, @cacheReadTokens, @model)
    `)
    .run({
      id: msg.id,
      sessionId: msg.sessionId,
      role: msg.role,
      content: JSON.stringify(msg.content),
      createdAt: msg.createdAt,
      inputTokens: msg.inputTokens ?? null,
      outputTokens: msg.outputTokens ?? null,
      cacheCreationTokens: msg.cacheCreationTokens ?? null,
      cacheReadTokens: msg.cacheReadTokens ?? null,
      model: msg.model ?? null,
    })
}

export function deleteMessagesAfter(sessionId: string, messageId: string): void {
  const msg = getDb()
    .prepare(`SELECT created_at FROM messages WHERE id = ?`)
    .get(messageId) as { created_at: number } | undefined
  if (!msg) return
  getDb()
    .prepare(`DELETE FROM messages WHERE session_id = ? AND created_at > ?`)
    .run(sessionId, msg.created_at)
}

// ── Settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'zh',
  defaultModel: 'claude-opus-4-6',
  autoScroll: true,
  showTimestamps: false,
  autoApprove: false,
  fontSize: 'md',
}

export function getSettings(): AppSettings {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[]
  const map: Record<string, unknown> = {}
  for (const row of rows) {
    try { map[row.key] = JSON.parse(row.value) } catch { map[row.key] = row.value }
  }
  return { ...DEFAULT_SETTINGS, ...map } as AppSettings
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  getDb()
    .prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`)
    .run(key, JSON.stringify(value))
}

// ── Providers ─────────────────────────────────────────────────────────
export function getProviders(): ApiProvider[] {
  return getDb()
    .prepare(`SELECT * FROM api_providers ORDER BY created_at ASC`)
    .all()
    .map(rowToProvider)
}

export function upsertProvider(p: ApiProvider): void {
  getDb()
    .prepare(`
      INSERT OR REPLACE INTO api_providers (id, name, type, api_key, base_url, default_model, is_default, created_at)
      VALUES (@id, @name, @type, @apiKey, @baseUrl, @defaultModel, @isDefault, @createdAt)
    `)
    .run({ ...p, isDefault: p.isDefault ? 1 : 0 })
}

export function deleteProvider(id: string): void {
  getDb().prepare(`DELETE FROM api_providers WHERE id = ?`).run(id)
}

// ── Skills ────────────────────────────────────────────────────────────
export function getSkills(scope?: 'global' | 'project', projectDir?: string): Skill[] {
  if (scope === 'project' && projectDir) {
    return getDb()
      .prepare(`SELECT * FROM skills WHERE scope = 'project' AND project_dir = ? ORDER BY created_at ASC`)
      .all(projectDir)
      .map(rowToSkill)
  }
  if (scope === 'global') {
    return getDb()
      .prepare(`SELECT * FROM skills WHERE scope = 'global' ORDER BY created_at ASC`)
      .all()
      .map(rowToSkill)
  }
  return getDb()
    .prepare(`SELECT * FROM skills ORDER BY created_at ASC`)
    .all()
    .map(rowToSkill)
}

export function upsertSkill(skill: Skill): void {
  getDb()
    .prepare(`
      INSERT OR REPLACE INTO skills (id, name, description, prompt, scope, project_dir, created_at, updated_at)
      VALUES (@id, @name, @description, @prompt, @scope, @projectDir, @createdAt, @updatedAt)
    `)
    .run({ ...skill, projectDir: skill.projectDir ?? null })
}

export function deleteSkill(id: string): void {
  getDb().prepare(`DELETE FROM skills WHERE id = ?`).run(id)
}

// ── MCP Servers ───────────────────────────────────────────────────────
export function getMcpServers(): McpServer[] {
  return getDb()
    .prepare(`SELECT * FROM mcp_servers ORDER BY created_at ASC`)
    .all()
    .map(rowToMcpServer)
}

export function upsertMcpServer(s: McpServer): void {
  getDb()
    .prepare(`
      INSERT OR REPLACE INTO mcp_servers (id, name, transport, command, args, url, env, enabled, created_at)
      VALUES (@id, @name, @transport, @command, @args, @url, @env, @enabled, @createdAt)
    `)
    .run({
      ...s,
      args: s.args ? JSON.stringify(s.args) : null,
      env: s.env ? JSON.stringify(s.env) : null,
      enabled: s.enabled ? 1 : 0,
    })
}

export function deleteMcpServer(id: string): void {
  getDb().prepare(`DELETE FROM mcp_servers WHERE id = ?`).run(id)
}

// ── Tasks ─────────────────────────────────────────────────────────────
export function getTasks(sessionId: string): Task[] {
  return getDb()
    .prepare(`SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at ASC`)
    .all(sessionId)
    .map(rowToTask)
}

export function upsertTask(task: Task): void {
  getDb()
    .prepare(`
      INSERT OR REPLACE INTO tasks (id, session_id, title, status, created_at, updated_at)
      VALUES (@id, @sessionId, @title, @status, @createdAt, @updatedAt)
    `)
    .run(task)
}

// ── Checkpoints ───────────────────────────────────────────────────────
export function getCheckpoints(sessionId: string): Checkpoint[] {
  return getDb()
    .prepare(`SELECT * FROM checkpoints WHERE session_id = ? ORDER BY created_at ASC`)
    .all(sessionId)
    .map(rowToCheckpoint)
}

export function insertCheckpoint(cp: Checkpoint): void {
  getDb()
    .prepare(`INSERT INTO checkpoints (id, session_id, message_id, snapshot_path, created_at) VALUES (@id, @sessionId, @messageId, @snapshotPath, @createdAt)`)
    .run(cp)
}

// ── Row mappers ───────────────────────────────────────────────────────
type Row = Record<string, unknown>

function rowToSession(r: unknown): ChatSession {
  const row = r as Row
  return {
    id: row.id as string,
    title: row.title as string,
    workDir: row.work_dir as string,
    model: row.model as string,
    mode: row.mode as ChatSession['mode'],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    archived: Boolean(row.archived),
    tokenCount: row.token_count as number,
    cost: row.cost as number,
  }
}

function rowToMessage(r: unknown): Message {
  const row = r as Row
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    role: row.role as Message['role'],
    content: JSON.parse(row.content as string),
    createdAt: row.created_at as number,
    inputTokens: row.input_tokens as number | undefined,
    outputTokens: row.output_tokens as number | undefined,
    cacheCreationTokens: row.cache_creation_tokens as number | undefined,
    cacheReadTokens: row.cache_read_tokens as number | undefined,
    model: row.model as string | undefined,
  }
}

function rowToProvider(r: unknown): ApiProvider {
  const row = r as Row
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as ApiProvider['type'],
    apiKey: row.api_key as string,
    baseUrl: row.base_url as string | undefined,
    defaultModel: row.default_model as string | undefined,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at as number,
  }
}

function rowToSkill(r: unknown): Skill {
  const row = r as Row
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    prompt: row.prompt as string,
    scope: row.scope as Skill['scope'],
    projectDir: row.project_dir as string | undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }
}

function rowToMcpServer(r: unknown): McpServer {
  const row = r as Row
  return {
    id: row.id as string,
    name: row.name as string,
    transport: row.transport as McpServer['transport'],
    command: row.command as string | undefined,
    args: row.args ? JSON.parse(row.args as string) : undefined,
    url: row.url as string | undefined,
    env: row.env ? JSON.parse(row.env as string) : undefined,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at as number,
  }
}

function rowToTask(r: unknown): Task {
  const row = r as Row
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    title: row.title as string,
    status: row.status as Task['status'],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  }
}

function rowToCheckpoint(r: unknown): Checkpoint {
  const row = r as Row
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    messageId: row.message_id as string,
    snapshotPath: row.snapshot_path as string,
    createdAt: row.created_at as number,
  }
}

function toSnake(camel: string): string {
  return camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

export default getDb
