'use client'

import { useEffect, useState } from 'react'
import type { Task } from '@/types'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

interface Props {
  sessionId: string
}

const STATUS_ICON = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
  cancelled: XCircle,
}

const STATUS_COLOR = {
  pending: 'text-muted-foreground',
  in_progress: 'text-blue-400',
  completed: 'text-green-500',
  cancelled: 'text-destructive',
}

export default function TaskPanel({ sessionId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    fetch(`/api/tasks?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then(setTasks)
      .catch(() => {})
  }, [sessionId])

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">暂无任务</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-2 overflow-y-auto h-full">
      {tasks.map((task) => {
        const Icon = STATUS_ICON[task.status]
        const color = STATUS_COLOR[task.status]
        return (
          <div
            key={task.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
          >
            <Icon
              size={14}
              className={cn(color, 'mt-0.5 flex-shrink-0', task.status === 'in_progress' && 'animate-spin')}
            />
            <span className="text-xs">{task.title}</span>
          </div>
        )
      })}
    </div>
  )
}
