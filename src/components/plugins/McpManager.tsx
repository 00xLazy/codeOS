'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Power } from 'lucide-react'
import type { McpServer } from '@/types'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'

export default function McpManager() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch('/api/mcp').then((r) => r.json()).then(setServers).catch(() => {})
  }, [])

  async function save(server: McpServer) {
    await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(server),
    })
    const updated = await fetch('/api/mcp').then((r) => r.json())
    setServers(updated)
    setAdding(false)
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/mcp/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setServers((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)))
  }

  async function remove(id: string) {
    await fetch(`/api/mcp/${id}`, { method: 'DELETE' })
    setServers((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          添加和管理 Model Context Protocol 服务器
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"
        >
          <Plus size={12} />
          添加服务器
        </button>
      </div>

      {servers.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium mb-1">未配置 MCP 服务器</p>
          <p className="text-xs text-muted-foreground">添加 MCP 服务器以扩展 Claude 的能力</p>
        </div>
      )}

      <div className="space-y-2">
        {servers.map((server) => (
          <div key={server.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{server.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {server.transport === 'stdio' ? server.command : server.url}
              </p>
            </div>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full',
              server.transport === 'stdio' ? 'bg-blue-500/10 text-blue-400' :
              server.transport === 'sse' ? 'bg-purple-500/10 text-purple-400' :
              'bg-green-500/10 text-green-400'
            )}>
              {server.transport}
            </span>
            <button
              onClick={() => toggle(server.id, !server.enabled)}
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center transition-colors',
                server.enabled
                  ? 'text-green-500 hover:bg-green-500/10'
                  : 'text-muted-foreground hover:bg-accent'
              )}
              title={server.enabled ? '禁用' : '启用'}
            >
              <Power size={13} />
            </button>
            <button
              onClick={() => remove(server.id)}
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {adding && (
          <McpServerForm
            onSave={save}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  )
}

function McpServerForm({
  onSave,
  onCancel,
}: {
  onSave: (s: McpServer) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [transport, setTransport] = useState<McpServer['transport']>('stdio')
  const [command, setCommand] = useState('')
  const [url, setUrl] = useState('')

  function handleSave() {
    if (!name.trim()) return
    onSave({
      id: nanoid(),
      name: name.trim(),
      transport,
      command: transport === 'stdio' ? command.trim() || undefined : undefined,
      url: transport !== 'stdio' ? url.trim() || undefined : undefined,
      enabled: true,
      createdAt: Date.now(),
    })
  }

  return (
    <div className="rounded-xl border border-primary/50 bg-card p-4 space-y-3">
      <h3 className="text-xs font-semibold">添加 MCP 服务器</h3>

      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="服务器名称"
          className="w-full text-xs bg-muted/30 border border-border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
        />

        <div className="flex gap-2">
          {(['stdio', 'sse', 'http'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTransport(t)}
              className={cn(
                'px-2 py-1 rounded text-xs border transition-colors',
                transport === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {transport === 'stdio' ? (
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="命令 (如: npx @modelcontextprotocol/server-filesystem)"
            className="w-full text-xs bg-muted/30 border border-border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono"
          />
        ) : (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (如: http://localhost:8080)"
            className="w-full text-xs bg-muted/30 border border-border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono"
          />
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/80 disabled:opacity-40 transition-colors"
        >
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}
