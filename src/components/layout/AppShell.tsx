'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import NavRail from './NavRail'
import ChatListPanel from './ChatListPanel'
import RightPanel from './RightPanel'
import { useResizablePanel } from '@/hooks/useResizablePanel'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const sessionId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null

  const { width: listWidth, handleMouseDown: listResize } = useResizablePanel(260, 160, 400)
  const { width: rightWidth, handleMouseDown: rightResize } = useResizablePanel(320, 200, 500)

  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Nav rail */}
      <NavRail />

      {/* Chat list */}
      <div
        className="flex-shrink-0 border-r border-border flex flex-col"
        style={{ width: listWidth }}
      >
        <ChatListPanel currentSessionId={sessionId} />
      </div>

      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-primary/30 transition-colors flex-shrink-0"
        onMouseDown={listResize}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Right panel resize handle */}
      {sessionId && rightPanelOpen && (
        <div
          className="w-1 cursor-col-resize hover:bg-primary/30 transition-colors flex-shrink-0"
          onMouseDown={rightResize}
        />
      )}

      {/* Right panel */}
      {sessionId && (
        <RightPanel
          sessionId={sessionId}
          open={rightPanelOpen}
          onToggle={() => setRightPanelOpen((v) => !v)}
          width={rightWidth}
        />
      )}
    </div>
  )
}
