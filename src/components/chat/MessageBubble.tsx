'use client'

import { useState } from 'react'
import { RotateCcw, GitFork, ChevronDown, ChevronUp } from 'lucide-react'
import type { Message, ContentBlock, ToolUseContent, ToolResultContent, ThinkingContent } from '@/types'
import { cn, formatTokens } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Props {
  message: Message
  isLast: boolean
  onRollback: (id: string) => void
}

export default function MessageBubble({ message, isLast, onRollback }: Props) {
  const isUser = message.role === 'user'
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={cn('group flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        {message.content.map((block, i) => (
          <ContentBlockRenderer key={i} block={block} isUser={isUser} />
        ))}

        {/* Token info */}
        {!isUser && (message.inputTokens || message.outputTokens) && (
          <p className="text-[10px] text-muted-foreground">
            {message.inputTokens ? `↑ ${formatTokens(message.inputTokens)}` : ''}
            {message.outputTokens ? ` ↓ ${formatTokens(message.outputTokens)}` : ''}
            {message.cacheReadTokens ? ` ⚡ ${formatTokens(message.cacheReadTokens)}` : ''}
          </p>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className={cn('flex items-start gap-1 mt-1', isUser ? 'order-first' : 'order-last')}>
          <button
            onClick={() => onRollback(message.id)}
            title="回滚到此处"
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function ContentBlockRenderer({ block, isUser }: { block: ContentBlock; isUser: boolean }) {
  if (block.type === 'text') {
    if (isUser) {
      return (
        <div className="px-3 py-2 rounded-2xl bg-primary text-primary-foreground text-sm">
          {block.text}
        </div>
      )
    }
    return (
      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {block.text}
        </ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <img
        src={`data:${block.mediaType};base64,${block.data}`}
        alt="附件"
        className="max-w-xs rounded-xl border border-border"
      />
    )
  }

  if (block.type === 'thinking') {
    return <ThinkingBlock block={block} />
  }

  if (block.type === 'tool_use') {
    return <ToolUseBlock block={block} />
  }

  if (block.type === 'tool_result') {
    return <ToolResultBlock block={block} />
  }

  return null
}

function ThinkingBlock({ block }: { block: ThinkingContent }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-lg overflow-hidden text-xs w-full max-w-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span>思考过程</span>
      </button>
      {open && (
        <div className="px-3 py-2 text-muted-foreground whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto">
          {block.thinking}
        </div>
      )}
    </div>
  )
}

function ToolUseBlock({ block }: { block: ToolUseContent }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-border rounded-lg overflow-hidden text-xs w-full max-w-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-muted/30 text-foreground hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span className="font-mono font-semibold">{block.name}</span>
        <span className="text-muted-foreground ml-auto text-[10px]">工具调用</span>
      </button>
      {open && (
        <pre className="px-3 py-2 text-[11px] font-mono overflow-x-auto bg-muted/20 text-muted-foreground max-h-40">
          {JSON.stringify(block.input, null, 2)}
        </pre>
      )}
    </div>
  )
}

function ToolResultBlock({ block }: { block: ToolResultContent }) {
  const [open, setOpen] = useState(false)
  const text = typeof block.content === 'string'
    ? block.content
    : block.content.map((c) => c.text).join('\n')

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden text-xs w-full max-w-xl',
        block.isError ? 'border-destructive/50' : 'border-border'
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 transition-colors',
          block.isError
            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
        )}
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span>{block.isError ? '执行错误' : '执行结果'}</span>
      </button>
      {open && (
        <pre className="px-3 py-2 text-[11px] font-mono overflow-x-auto max-h-60 whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </div>
  )
}
