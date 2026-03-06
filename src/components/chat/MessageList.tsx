'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/types'
import MessageBubble from './MessageBubble'

interface Props {
  messages: Message[]
  streaming: boolean
  onRollback: (messageId: string) => void
}

export default function MessageList({ messages, streaming, onRollback }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom || streaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <p className="text-2xl font-semibold text-foreground">开始对话</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          提问、获取代码帮助或探索想法。
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={i === messages.length - 1}
          onRollback={onRollback}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
