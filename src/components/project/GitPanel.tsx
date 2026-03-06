'use client'

import { useEffect, useState } from 'react'
import type { GitStatus, GitCommit } from '@/types'
import { cn } from '@/lib/utils'
import { GitCommit as GitCommitIcon, GitBranch, RefreshCw } from 'lucide-react'

interface Props {
  sessionId: string
}

type Tab = 'status' | 'log'

export default function GitPanel({ sessionId }: Props) {
  const [workDir, setWorkDir] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('status')
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [log, setLog] = useState<GitCommit[]>([])
  const [diff, setDiff] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((s) => s.workDir && setWorkDir(s.workDir))
  }, [sessionId])

  useEffect(() => {
    if (!workDir) return
    refresh()
  }, [workDir, tab])

  async function refresh() {
    if (!workDir) return
    setLoading(true)
    try {
      if (tab === 'status') {
        const res = await fetch(`/api/git/status?dir=${encodeURIComponent(workDir)}`)
        if (res.ok) setStatus(await res.json())
      } else {
        const res = await fetch(`/api/git/log?dir=${encodeURIComponent(workDir)}`)
        if (res.ok) setLog(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  async function showDiff(hash?: string) {
    if (!workDir) return
    const url = hash
      ? `/api/git/diff?dir=${encodeURIComponent(workDir)}&hash=${hash}`
      : `/api/git/diff?dir=${encodeURIComponent(workDir)}`
    const res = await fetch(url)
    if (res.ok) {
      const { diff: d } = await res.json()
      setDiff(d)
    }
  }

  if (!workDir) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">无项目目录</p>
      </div>
    )
  }

  if (diff !== null) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button onClick={() => setDiff(null)} className="text-xs text-primary hover:underline">
            ← 返回
          </button>
          <span className="text-xs text-muted-foreground">Diff</span>
        </div>
        <pre className="flex-1 overflow-auto px-3 py-2 text-[11px] font-mono">
          {diff.split('\n').map((line, i) => (
            <div
              key={i}
              className={cn(
                line.startsWith('+') && !line.startsWith('+++')
                  ? 'text-green-400 bg-green-950/30'
                  : line.startsWith('-') && !line.startsWith('---')
                  ? 'text-red-400 bg-red-950/30'
                  : line.startsWith('@@')
                  ? 'text-blue-400'
                  : 'text-muted-foreground'
              )}
            >
              {line}
            </div>
          ))}
        </pre>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
        {(['status', 'log'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              tab === t
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            {t === 'status' ? (
              <>
                <GitBranch size={11} />
                状态
              </>
            ) : (
              <>
                <GitCommitIcon size={11} />
                历史
              </>
            )}
          </button>
        ))}
        <button
          onClick={refresh}
          disabled={loading}
          className="ml-auto w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'status' && status && <GitStatusView status={status} onShowDiff={showDiff} />}
        {tab === 'log' && <GitLogView commits={log} onShowDiff={(hash) => showDiff(hash)} />}
      </div>
    </div>
  )
}

function GitStatusView({ status, onShowDiff }: { status: GitStatus; onShowDiff: (hash?: string) => void }) {
  return (
    <div className="px-3 py-2 space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <GitBranch size={12} className="text-muted-foreground" />
        <span className="font-medium">{status.branch}</span>
        {(status.ahead > 0 || status.behind > 0) && (
          <span className="text-muted-foreground">
            {status.ahead > 0 && `↑${status.ahead}`}
            {status.behind > 0 && ` ↓${status.behind}`}
          </span>
        )}
      </div>

      <button
        onClick={() => onShowDiff()}
        className="text-xs text-primary hover:underline"
      >
        查看 Diff
      </button>

      {status.staged.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-green-500 uppercase mb-1">暂存</p>
          {status.staged.map((f) => (
            <div key={f.path} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] font-mono text-green-500">{f.status}</span>
              <span className="text-xs truncate">{f.path}</span>
            </div>
          ))}
        </div>
      )}

      {status.unstaged.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-yellow-500 uppercase mb-1">未暂存</p>
          {status.unstaged.map((f) => (
            <div key={f.path} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] font-mono text-yellow-500">{f.status}</span>
              <span className="text-xs truncate">{f.path}</span>
            </div>
          ))}
        </div>
      )}

      {status.untracked.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-blue-400 uppercase mb-1">未跟踪</p>
          {status.untracked.map((f) => (
            <div key={f} className="py-0.5">
              <span className="text-xs truncate text-blue-400">{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GitLogView({ commits, onShowDiff }: { commits: GitCommit[]; onShowDiff: (hash: string) => void }) {
  return (
    <div className="px-2 py-2 space-y-1">
      {commits.map((commit) => (
        <button
          key={commit.hash}
          onClick={() => onShowDiff(commit.hash)}
          className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors text-left"
        >
          <span className="text-[10px] font-mono text-muted-foreground mt-0.5 flex-shrink-0">
            {commit.shortHash}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{commit.subject}</p>
            <p className="text-[10px] text-muted-foreground">
              {commit.author} · {commit.date}
            </p>
          </div>
          {commit.refs && (
            <span className="text-[10px] text-primary bg-primary/10 px-1 rounded flex-shrink-0">
              {commit.refs}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
