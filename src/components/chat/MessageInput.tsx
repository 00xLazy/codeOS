'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Square, Paperclip, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/types'

interface Props {
  session: ChatSession
  onSend: (text: string, attachments: string[]) => void
  streaming: boolean
  onStop: () => void
}

type Mode = 'code' | 'plan' | 'ask'

const MODE_LABELS: Record<Mode, string> = {
  code: '代码',
  plan: '计划',
  ask: '提问',
}

const SLASH_COMMANDS = [
  { name: '/help', desc: '显示帮助信息' },
  { name: '/clear', desc: '清除对话历史' },
  { name: '/compact', desc: '压缩上下文' },
  { name: '/cost', desc: '显示 Token 用量' },
  { name: '/review', desc: '代码审查' },
  { name: '/doctor', desc: '诊断项目' },
  { name: '/memory', desc: '编辑记忆文件' },
]

export default function MessageInput({ session, onSend, streaming, onStop }: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>(session.mode as Mode)
  const [showCommands, setShowCommands] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [text])

  // Show slash commands
  useEffect(() => {
    setShowCommands(text.startsWith('/') && !text.includes(' '))
  }, [text])

  const handleSend = useCallback(() => {
    if (!text.trim() && attachments.length === 0) return
    if (streaming) return
    onSend(text.trim(), attachments)
    setText('')
    setAttachments([])
  }, [text, attachments, streaming, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showCommands) return
      handleSend()
    }
    if (e.key === 'Escape') setShowCommands(false)
  }

  const pickImages = async () => {
    if (typeof window.electronAPI === 'undefined') return
    const paths = await window.electronAPI.pickImages()
    const base64s = await Promise.all(
      paths.map((p) => window.electronAPI.readFileBase64(p))
    )
    setAttachments((prev) => [...prev, ...base64s])
  }

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.name.startsWith(text.split(' ')[0])
  )

  return (
    <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative">
              <img
                src={`data:image/png;base64,${att}`}
                className="w-16 h-16 rounded-lg object-cover border border-border"
                alt=""
              />
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Slash commands */}
      {showCommands && filteredCommands.length > 0 && (
        <div className="mb-2 border border-border rounded-lg overflow-hidden bg-card shadow-lg">
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.name}
              onClick={() => {
                setText(cmd.name + ' ')
                setShowCommands(false)
                textareaRef.current?.focus()
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
            >
              <span className="font-mono font-semibold text-primary">{cmd.name}</span>
              <span className="text-muted-foreground">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 focus-within:ring-1 focus-within:ring-ring">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`发送消息给 Claude (${MODE_LABELS[mode]} 模式)`}
          rows={1}
          disabled={streaming}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 min-h-[24px]"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Attachment */}
            <button
              onClick={pickImages}
              className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="附加图片"
            >
              <Paperclip size={14} />
            </button>

            {/* Mode selector */}
            <ModeSelector mode={mode} onChange={setMode} />
          </div>

          {/* Send / Stop */}
          <button
            onClick={streaming ? onStop : handleSend}
            disabled={!streaming && !text.trim() && attachments.length === 0}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              streaming
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {streaming ? <Square size={14} /> : <Send size={14} />}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-1">
        Enter 发送 · Shift+Enter 换行 · / 触发命令
      </p>
    </div>
  )
}

function ModeSelector({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const [open, setOpen] = useState(false)
  const MODES: Mode[] = ['code', 'plan', 'ask']

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {MODE_LABELS[mode]}
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 z-20 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => { onChange(m); setOpen(false) }}
                className={cn(
                  'w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors',
                  m === mode ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
