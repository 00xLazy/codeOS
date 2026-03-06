'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  MessageSquare,
  Puzzle,
  Settings,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/chat', icon: MessageSquare, label: '对话' },
  { href: '/extensions', icon: Puzzle, label: '扩展' },
  { href: '/settings', icon: Settings, label: '设置' },
]

export default function NavRail() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <nav className="w-14 flex-shrink-0 flex flex-col items-center py-3 border-r border-border bg-card drag-region">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mb-4 no-drag">
        <span className="text-primary-foreground font-bold text-xs">CO</span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1 no-drag">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={item.label}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon size={18} />
            </button>
          )
        })}
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(nextTheme)}
        title="切换主题"
        className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors no-drag"
      >
        <ThemeIcon size={18} />
      </button>
    </nav>
  )
}
