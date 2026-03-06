'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, FolderOpen, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import type { ChatSession } from '@/types'
import { nanoid } from 'nanoid'

interface Props {
  currentSessionId: string | null
}

interface SessionGroup {
  dir: string
  sessions: ChatSession[]
  expanded: boolean
}

export default function ChatListPanel({ currentSessionId }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState<SessionGroup[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')
      const sessions: ChatSession[] = await res.json()

      // Group by workDir
      const map = new Map<string, ChatSession[]>()
      for (const s of sessions) {
        const key = s.workDir || ''
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(s)
      }

      setGroups((prev) =>
        Array.from(map.entries()).map(([dir, dirSessions]) => {
          const existing = prev.find((g) => g.dir === dir)
          return { dir, sessions: dirSessions, expanded: existing?.expanded ?? true }
        })
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function newSession() {
    // Open directory picker and create a new session
    const dir = typeof window.electronAPI !== 'undefined'
      ? await window.electronAPI.openDirectory()
      : null

    const session: ChatSession = {
      id: nanoid(),
      title: '新对话',
      workDir: dir || '',
      model: 'claude-opus-4-6',
      mode: 'code',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
      tokenCount: 0,
      cost: 0,
    }

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(session),
    })

    await loadSessions()
    router.push(`/chat/${session.id}`)
  }

  async function deleteSession(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    if (currentSessionId === id) router.push('/chat')
    loadSessions()
  }

  const filtered = groups.map((g) => ({
    ...g,
    sessions: g.sessions.filter(
      (s) =>
        !search ||
        s.title.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.sessions.length > 0)

  const dirName = (dir: string) =>
    dir ? dir.split('/').pop() || dir : '无项目'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 drag-region">
        <div className="flex items-center justify-between mb-2 no-drag">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            对话列表
          </span>
          <button
            onClick={newSession}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="新建对话"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="relative no-drag">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索会话..."
            className="w-full pl-6 pr-2 py-1.5 text-xs rounded-md bg-muted/50 border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center mt-6">加载中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center mt-6">暂无会话</p>
        ) : (
          filtered.map((group) => (
            <div key={group.dir} className="mb-1">
              {/* Group header */}
              <button
                onClick={() =>
                  setGroups((g) =>
                    g.map((gg) =>
                      gg.dir === group.dir
                        ? { ...gg, expanded: !gg.expanded }
                        : gg
                    )
                  )
                }
                className="flex items-center gap-1 w-full px-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {group.expanded ? (
                  <ChevronDown size={10} />
                ) : (
                  <ChevronRight size={10} />
                )}
                <FolderOpen size={10} />
                <span className="truncate font-medium">{dirName(group.dir)}</span>
              </button>

              {/* Sessions */}
              {group.expanded &&
                group.sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    active={currentSessionId === session.id}
                    onSelect={() => router.push(`/chat/${session.id}`)}
                    onDelete={(e) => deleteSession(e, session.id)}
                  />
                ))}
            </div>
          ))
        )}
      </div>

      {/* Footer - new chat button */}
      <div className="p-2 border-t border-border">
        <button
          onClick={newSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus size={14} />
          新建对话
        </button>
      </div>
    </div>
  )
}

function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: ChatSession
  active: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ml-3',
        active
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-foreground'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatRelativeTime(session.updatedAt)}
        </p>
      </div>

      {hovered && (
        <button
          onClick={onDelete}
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  )
}
