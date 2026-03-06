'use client'

import { useState } from 'react'
import { Settings, Square, ChevronDown } from 'lucide-react'
import type { ChatSession } from '@/types'
import { cn, truncate } from '@/lib/utils'

const MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]

interface Props {
  session: ChatSession
  onSessionChange: (s: ChatSession) => void
  streaming: boolean
  onStop: () => void
}

export default function ChatHeader({ session, onSessionChange, streaming, onStop }: Props) {
  const [showModels, setShowModels] = useState(false)

  async function setModel(model: string) {
    await fetch(`/api/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model }),
    })
    onSessionChange({ ...session, model })
    setShowModels(false)
  }

  const shortModel = session.model.replace('claude-', '').replace(/-\d{8}$/, '')

  return (
    <div className="flex items-center gap-3 px-4 h-12 border-b border-border flex-shrink-0 drag-region">
      {/* Title */}
      <h1 className="text-sm font-medium truncate flex-1 no-drag">
        {truncate(session.title, 40)}
      </h1>

      <div className="flex items-center gap-2 no-drag">
        {/* Streaming indicator */}
        {streaming && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">运行中</span>
          </div>
        )}

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowModels((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-border"
          >
            {shortModel}
            <ChevronDown size={10} />
          </button>
          {showModels && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowModels(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-48">
                {MODELS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={cn(
                      'w-full px-3 py-2 text-xs text-left hover:bg-accent transition-colors',
                      m === session.model
                        ? 'text-foreground bg-accent/50'
                        : 'text-muted-foreground'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Workdir */}
        {session.workDir && (
          <span className="text-[10px] text-muted-foreground truncate max-w-32">
            {session.workDir.split('/').pop()}
          </span>
        )}
      </div>
    </div>
  )
}
