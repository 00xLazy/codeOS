import type { IpcMain, BrowserWindow } from 'electron'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import type { Message, ContentBlock, SendMessageOpts, PermissionRequest, PermissionDecision } from '../src/types'

// Active sessions: sessionId -> abort controller
const activeSessions = new Map<string, { abort: () => void }>()

// Pending permission: permissionId -> resolve
const pendingPermissions = new Map<string, (decision: PermissionDecision) => void>()

// Directory store
let storedDirs: string[] = []
const dirsFile = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.codeos',
  'dirs.json'
)

function loadDirs() {
  try {
    storedDirs = JSON.parse(fs.readFileSync(dirsFile, 'utf-8'))
  } catch {
    storedDirs = []
  }
}

function saveDirs() {
  fs.mkdirSync(path.dirname(dirsFile), { recursive: true })
  fs.writeFileSync(dirsFile, JSON.stringify(storedDirs))
}

function getClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim()
  } catch {
    const candidates = [
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(process.env.HOME || '', '.npm-global/bin/claude'),
      path.join(process.env.HOME || '', '.nvm/versions/node/current/bin/claude'),
    ]
    return candidates.find((c) => fs.existsSync(c)) || 'claude'
  }
}

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function setupClaudeHandlers(ipcMain: IpcMain, getWin: () => BrowserWindow | null) {
  loadDirs()

  // ── Directory management ─────────────────────────────────────────
  ipcMain.handle('dirs:get', () => storedDirs)

  ipcMain.handle('dirs:remove', (_e, dir: string) => {
    storedDirs = storedDirs.filter((d) => d !== dir)
    saveDirs()
  })

  ipcMain.handle('dirs:reorder', (_e, dirs: string[]) => {
    storedDirs = dirs
    saveDirs()
  })

  // ── Session management via API ───────────────────────────────────
  ipcMain.handle('sessions:all', async () => {
    const res = await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions`)
    return res.json()
  })

  ipcMain.handle('sessions:byDir', async (_e, workDir: string) => {
    if (workDir && !storedDirs.includes(workDir)) {
      storedDirs.unshift(workDir)
      saveDirs()
    }
    const res = await fetch(
      `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions?workDir=${encodeURIComponent(workDir)}`
    )
    return res.json()
  })

  ipcMain.handle('sessions:archive', async (_e, id: string) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${id}`, {
      method: 'DELETE',
    })
  })

  ipcMain.handle('sessions:rename', async (_e, id: string, title: string) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  })

  ipcMain.handle('sessions:markDone', async (_e, id: string) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
  })

  // ── Messages ─────────────────────────────────────────────────────
  ipcMain.handle('messages:get', async (_e, sessionId: string) => {
    const res = await fetch(
      `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${sessionId}/messages`
    )
    return res.json()
  })

  ipcMain.handle('messages:truncate', async (_e, sessionId: string, messageId: string) => {
    await fetch(
      `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${sessionId}/messages`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ afterMessageId: messageId }),
      }
    )
  })

  ipcMain.handle('messages:cleanThinking', async (_e, sessionId: string) => {
    await fetch(
      `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${sessionId}/messages/clean-thinking`,
      { method: 'POST' }
    )
  })

  // ── Permission ───────────────────────────────────────────────────
  ipcMain.handle('claude:permissionResponse', (_e, id: string, decision: PermissionDecision) => {
    pendingPermissions.get(id)?.(decision)
    pendingPermissions.delete(id)
  })

  // ── Stop ─────────────────────────────────────────────────────────
  ipcMain.handle('claude:stop', (_e, sessionId: string) => {
    activeSessions.get(sessionId)?.abort()
    activeSessions.delete(sessionId)
  })

  // ── Checkpoint rollback ──────────────────────────────────────────
  ipcMain.handle('checkpoint:rollback', async (_e, sessionId: string, messageId: string) => {
    await fetch(
      `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/sessions/${sessionId}/messages`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ afterMessageId: messageId }),
      }
    )
  })

  // ── Settings ─────────────────────────────────────────────────────
  ipcMain.handle('settings:get', async () => {
    const res = await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/settings`)
    return res.json()
  })

  ipcMain.handle('settings:set', async (_e, key: string, value: unknown) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/settings`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    getWin()?.webContents.send('settings:changed')
  })

  ipcMain.handle('settings:open', () => {
    // Navigate to settings page
    getWin()?.webContents.send('navigate', '/settings')
  })

  // ── Providers ────────────────────────────────────────────────────
  ipcMain.handle('providers:get', async () => {
    const res = await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/providers`)
    return res.json()
  })

  ipcMain.handle('providers:add', async (_e, p: unknown) => {
    const res = await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/providers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    })
    return res.json()
  })

  ipcMain.handle('providers:update', async (_e, id: string, p: unknown) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/providers/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
    })
  })

  ipcMain.handle('providers:delete', async (_e, id: string) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/providers/${id}`, {
      method: 'DELETE',
    })
  })

  // ── Skills ───────────────────────────────────────────────────────
  ipcMain.handle('skills:get', async (_e, projectDir?: string) => {
    const url = projectDir
      ? `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/skills?projectDir=${encodeURIComponent(projectDir)}`
      : `http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/skills`
    const res = await fetch(url)
    return res.json()
  })

  ipcMain.handle('skills:setEnabled', async (_e, skillId: string, enabled: boolean) => {
    await fetch(`http://127.0.0.1:${process.env.CODEOS_PORT || 3000}/api/skills/${skillId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
  })

  // ── Claude send message (main handler) ───────────────────────────
  ipcMain.handle(
    'claude:send',
    async (e, sessionId: string, content: ContentBlock[], opts: SendMessageOpts) => {
      const win = getWin()
      if (!win) return

      let aborted = false
      const abort = () => { aborted = true }
      activeSessions.set(sessionId, { abort })

      // Ensure session + user message are persisted
      const port = process.env.CODEOS_PORT || 3000
      const userMsgId = nanoid()
      const userMsg: Message = {
        id: userMsgId,
        sessionId,
        role: 'user',
        content,
        createdAt: Date.now(),
      }

      await fetch(`http://127.0.0.1:${port}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(userMsg),
      })

      // Get text from content blocks
      const textContent = content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('\n')

      // Build env for claude CLI
      const claudeEnv: Record<string, string> = { ...process.env as Record<string, string> }

      // Get provider config
      try {
        const provRes = await fetch(`http://127.0.0.1:${port}/api/providers`)
        const providers = await provRes.json()
        const defaultProvider = providers.find((p: { isDefault: boolean }) => p.isDefault) || providers[0]
        if (defaultProvider?.apiKey) {
          claudeEnv.ANTHROPIC_API_KEY = defaultProvider.apiKey
        }
        if (defaultProvider?.baseUrl) {
          claudeEnv.ANTHROPIC_BASE_URL = defaultProvider.baseUrl
        }
      } catch { /* use env vars */ }

      // Get settings for auto-approve
      let autoApprove = false
      try {
        const settRes = await fetch(`http://127.0.0.1:${port}/api/settings`)
        const settings = await settRes.json()
        autoApprove = settings.autoApprove || false
      } catch { /* default false */ }

      // Build claude CLI args
      const args = [
        '--output-format', 'stream-json',
        '--verbose',
        '--model', opts.model || 'claude-opus-4-6',
      ]

      if (opts.mode === 'plan') args.push('--plan')
      if (autoApprove) {
        args.push('--allowedTools', 'all')
      }
      if (opts.workDir) args.push('--cwd', opts.workDir)

      const { spawn } = await import('child_process')
      const claudeExec = getClaudePath()

      const proc = spawn(claudeExec, [...args, textContent], {
        cwd: opts.workDir || process.env.HOME,
        env: claudeEnv,
      })

      // Accumulate assistant message
      const assistantMsgId = nanoid()
      const assistantMsg: Message = {
        id: assistantMsgId,
        sessionId,
        role: 'assistant',
        content: [],
        createdAt: Date.now(),
      }

      let currentText = ''
      let buffer = ''

      proc.stdout.on('data', (chunk: Buffer) => {
        if (aborted) { proc.kill(); return }
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            handleStreamEvent(event, assistantMsg, (msg) => {
              win.webContents.send(`claude:message:${sessionId}`, { ...msg })
            })
          } catch { /* not JSON line */ }
        }
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        if (aborted) return
        const text = chunk.toString()
        // Handle permission requests in stderr
        if (text.includes('permission') || text.includes('allow')) {
          const permId = nanoid()
          const req: PermissionRequest = {
            id: permId,
            sessionId,
            toolName: 'unknown',
            toolInput: { message: text.trim() },
            timestamp: Date.now(),
          }
          win.webContents.send('claude:permissionRequest', req)
        }
      })

      await new Promise<void>((resolve) => {
        proc.on('close', async () => {
          if (!aborted && assistantMsg.content.length > 0) {
            // Persist final message
            await fetch(`http://127.0.0.1:${port}/api/sessions/${sessionId}/messages`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(assistantMsg),
            })
            // Update session title if first message
            await fetch(`http://127.0.0.1:${port}/api/sessions/${sessionId}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ updatedAt: Date.now() }),
            })
          }
          activeSessions.delete(sessionId)
          resolve()
        })
      })
    }
  )
}

function handleStreamEvent(
  event: Record<string, unknown>,
  msg: Message,
  emit: (msg: Message) => void
) {
  const type = event.type as string

  if (type === 'content_block_start') {
    const block = event.content_block as Record<string, unknown>
    if (block?.type === 'text') {
      msg.content.push({ type: 'text', text: '' })
    } else if (block?.type === 'thinking') {
      msg.content.push({ type: 'thinking', thinking: '' })
    } else if (block?.type === 'tool_use') {
      msg.content.push({
        type: 'tool_use',
        id: block.id as string,
        name: block.name as string,
        input: {},
      })
    }
  } else if (type === 'content_block_delta') {
    const delta = event.delta as Record<string, unknown>
    const index = event.index as number
    const block = msg.content[index]

    if (block?.type === 'text' && delta?.type === 'text_delta') {
      block.text += delta.text as string
      emit(msg)
    } else if (block?.type === 'thinking' && delta?.type === 'thinking_delta') {
      block.thinking += delta.thinking as string
      emit(msg)
    } else if (block?.type === 'tool_use' && delta?.type === 'input_json_delta') {
      // accumulate, parse on stop
    }
  } else if (type === 'content_block_stop') {
    emit(msg)
  } else if (type === 'message_delta') {
    const usage = (event.usage as Record<string, unknown>) || {}
    if (usage.output_tokens) msg.outputTokens = usage.output_tokens as number
    emit(msg)
  } else if (type === 'message_start') {
    const message = event.message as Record<string, unknown>
    const usage = (message?.usage as Record<string, unknown>) || {}
    if (usage.input_tokens) msg.inputTokens = usage.input_tokens as number
    if (usage.cache_read_input_tokens) msg.cacheReadTokens = usage.cache_read_input_tokens as number
    if (usage.cache_creation_input_tokens) msg.cacheCreationTokens = usage.cache_creation_input_tokens as number
  } else if (type === 'tool_use') {
    // From claude CLI stream-json format
    const toolUse = event as Record<string, unknown>
    msg.content.push({
      type: 'tool_use',
      id: toolUse.id as string || '',
      name: toolUse.name as string || '',
      input: (toolUse.input as Record<string, unknown>) || {},
    })
    emit(msg)
  } else if (type === 'tool_result') {
    const toolResult = event as Record<string, unknown>
    msg.content.push({
      type: 'tool_result',
      toolUseId: toolResult.tool_use_id as string || '',
      content: toolResult.content as string || '',
      isError: Boolean(toolResult.is_error),
    })
    emit(msg)
  } else if (type === 'text') {
    // Simple text event from claude CLI
    const existing = msg.content.find((b) => b.type === 'text')
    if (existing && existing.type === 'text') {
      existing.text += event.text as string
    } else {
      msg.content.push({ type: 'text', text: event.text as string || '' })
    }
    emit(msg)
  }
}
