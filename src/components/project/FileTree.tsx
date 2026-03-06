'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import type { FileNode } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  sessionId: string
}

export default function FileTree({ sessionId }: Props) {
  const [workDir, setWorkDir] = useState<string | null>(null)
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null)

  useEffect(() => {
    async function loadSession() {
      const res = await fetch(`/api/sessions/${sessionId}`)
      if (res.ok) {
        const s = await res.json()
        if (s.workDir) setWorkDir(s.workDir)
      }
    }
    loadSession()
  }, [sessionId])

  useEffect(() => {
    if (!workDir) return
    setLoading(true)
    fetch(`/api/files?dir=${encodeURIComponent(workDir)}`)
      .then((r) => r.json())
      .then((data) => setTree(data))
      .finally(() => setLoading(false))
  }, [workDir])

  if (!workDir) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">选择项目文件夹以查看文件</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (preview) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={() => setPreview(null)}
            className="text-xs text-primary hover:underline"
          >
            ← 返回
          </button>
          <span className="text-xs text-muted-foreground truncate">{preview.path.split('/').pop()}</span>
        </div>
        <pre className="flex-1 overflow-auto px-3 py-2 text-[11px] font-mono text-muted-foreground">
          {preview.content}
        </pre>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-2">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileClick={async (path) => {
            const res = await fetch(`/api/files/content?path=${encodeURIComponent(path)}`)
            if (res.ok) {
              const { content } = await res.json()
              setPreview({ path, content })
            }
          }}
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  depth,
  onFileClick,
}: {
  node: FileNode
  depth: number
  onFileClick: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const isDir = node.type === 'directory'

  const gitColor =
    node.gitStatus === 'M'
      ? 'text-yellow-500'
      : node.gitStatus === 'A'
      ? 'text-green-500'
      : node.gitStatus === 'D'
      ? 'text-red-500'
      : node.gitStatus === '?'
      ? 'text-blue-400'
      : ''

  return (
    <div>
      <div
        onClick={() => (isDir ? setExpanded((v) => !v) : onFileClick(node.path))}
        className={cn(
          'flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer hover:bg-accent/50 transition-colors',
          gitColor
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isDir ? (
          <>
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {expanded ? (
              <FolderOpen size={12} className="text-yellow-400" />
            ) : (
              <Folder size={12} className="text-yellow-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-2.5" />
            <File size={12} className="text-muted-foreground" />
          </>
        )}
        <span className="text-xs truncate">{node.name}</span>
        {node.gitStatus && (
          <span className={cn('text-[10px] ml-auto font-mono', gitColor)}>
            {node.gitStatus}
          </span>
        )}
      </div>

      {isDir && expanded && node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  )
}
