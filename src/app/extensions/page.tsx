'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import SkillsManager from '@/components/skills/SkillsManager'
import McpManager from '@/components/plugins/McpManager'

type Tab = 'skills' | 'mcp'

export default function ExtensionsPage() {
  const [tab, setTab] = useState<Tab>('skills')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border flex-shrink-0">
        <h1 className="text-sm font-semibold mr-4">扩展</h1>
        {(['skills', 'mcp'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded text-xs transition-colors',
              tab === t
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {t === 'skills' ? '技能' : 'MCP 服务器'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'skills' && <SkillsManager />}
        {tab === 'mcp' && <McpManager />}
      </div>
    </div>
  )
}
