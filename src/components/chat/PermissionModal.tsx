'use client'

import { AlertTriangle, Check, X, Shield } from 'lucide-react'
import type { PermissionRequest, PermissionDecision } from '@/types'

interface Props {
  request: PermissionRequest
  onResponse: (decision: PermissionDecision) => void
}

export default function PermissionModal({ request, onResponse }: Props) {
  const { toolName, toolInput } = request

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-end justify-center pb-24 z-50">
      <div className="w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-amber-500/10">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">权限请求</p>
            <p className="text-xs text-muted-foreground">
              Claude 请求执行 <span className="font-mono text-foreground">{toolName}</span>
            </p>
          </div>
        </div>

        {/* Tool input */}
        <div className="px-4 py-3 max-h-48 overflow-y-auto">
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
            {JSON.stringify(toolInput, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
          <button
            onClick={() => onResponse('deny')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={12} />
            拒绝
          </button>

          <button
            onClick={() => onResponse('allow')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            <Check size={12} />
            允许
          </button>

          <button
            onClick={() => onResponse('always_allow')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-primary/50 text-primary hover:bg-primary/10 transition-colors ml-auto"
          >
            <Shield size={12} />
            本次会话始终允许
          </button>
        </div>
      </div>
    </div>
  )
}
