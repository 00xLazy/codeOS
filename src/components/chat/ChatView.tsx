'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { ChatSession, Message, PermissionRequest } from '@/types'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ChatHeader from './ChatHeader'
import PermissionModal from './PermissionModal'

interface Props {
  sessionId: string
}

export default function ChatView({ sessionId }: Props) {
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)
  const abortRef = useRef<(() => void) | null>(null)

  // Load session + messages
  useEffect(() => {
    let cancelled = false

    async function load() {
      const [sessRes, msgRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/messages`),
      ])
      if (cancelled) return
      if (sessRes.ok) setSession(await sessRes.json())
      if (msgRes.ok) setMessages(await msgRes.json())
    }

    load()
    return () => { cancelled = true }
  }, [sessionId])

  // SSE stream listener
  useEffect(() => {
    if (typeof window.electronAPI === 'undefined') return

    const unsub = window.electronAPI.onClaudeMessage(sessionId, (msg: Message) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = msg
          return next
        }
        return [...prev, msg]
      })
    })

    const unsubPerm = window.electronAPI.claudeControl((req: PermissionRequest) => {
      if (req.sessionId === sessionId) setPendingPermission(req)
    })

    return () => {
      unsub()
      unsubPerm()
    }
  }, [sessionId])

  const handleSend = useCallback(
    async (text: string, attachments: string[]) => {
      if (!session || streaming) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'user',
        content: [
          ...attachments.map((a) => ({
            type: 'image' as const,
            mediaType: 'image/png',
            data: a,
          })),
          { type: 'text' as const, text },
        ],
        createdAt: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setStreaming(true)

      try {
        await window.electronAPI.sendClaudeMessage(sessionId, userMessage.content, {
          model: session.model,
          mode: session.mode,
          workDir: session.workDir,
          checkpointEnabled: true,
        })
      } finally {
        setStreaming(false)
      }
    },
    [session, sessionId, streaming]
  )

  const handleStop = useCallback(() => {
    window.electronAPI?.stopClaude(sessionId)
    setStreaming(false)
  }, [sessionId])

  const handleRollback = useCallback(
    async (messageId: string) => {
      await window.electronAPI?.rollbackCheckpoint(sessionId, messageId)
      const res = await fetch(`/api/sessions/${sessionId}/messages`)
      if (res.ok) setMessages(await res.json())
    },
    [sessionId]
  )

  const handlePermissionResponse = useCallback(
    async (decision: 'allow' | 'deny' | 'always_allow') => {
      if (!pendingPermission) return
      await window.electronAPI?.claudeControlResponse(pendingPermission.id, decision)
      setPendingPermission(null)
    },
    [pendingPermission]
  )

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader
        session={session}
        onSessionChange={setSession}
        streaming={streaming}
        onStop={handleStop}
      />

      <MessageList
        messages={messages}
        streaming={streaming}
        onRollback={handleRollback}
      />

      <MessageInput
        session={session}
        onSend={handleSend}
        streaming={streaming}
        onStop={handleStop}
      />

      {pendingPermission && (
        <PermissionModal
          request={pendingPermission}
          onResponse={handlePermissionResponse}
        />
      )}
    </div>
  )
}
