'use client'

import { useState } from 'react'
import { PanelRight, Files, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import FileTree from '@/components/project/FileTree'
import TaskPanel from '@/components/project/TaskPanel'
import GitPanel from '@/components/project/GitPanel'
import { GitBranch } from 'lucide-react'

type Tab = 'files' | 'tasks' | 'git'

interface Props {
  sessionId: string
  open: boolean
  onToggle: () => void
  width: number
}

export default function RightPanel({ sessionId, open, onToggle, width }: Props) {
  const [tab, setTab] = useState<Tab>('files')

  const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'files', icon: Files, label: '文件' },
    { id: 'tasks', icon: ListChecks, label: '任务' },
    { id: 'git', icon: GitBranch, label: 'Git' },
  ]

  return (
    <div
      className={cn(
        'flex-shrink-0 border-l border-border flex flex-col transition-all duration-200 overflow-hidden',
        open ? 'opacity-100' : 'w-0 opacity-0'
      )}
      style={{ width: open ? width : 0 }}
    >
      {/* Toggle + Tabs */}
      <div className="flex items-center border-b border-border px-2 h-10 gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <PanelRight size={14} />
        </button>

        <div className="flex gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                tab === t.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <t.icon size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'files' && <FileTree sessionId={sessionId} />}
        {tab === 'tasks' && <TaskPanel sessionId={sessionId} />}
        {tab === 'git' && <GitPanel sessionId={sessionId} />}
      </div>
    </div>
  )
}
