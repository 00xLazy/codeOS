'use client'

import { Code2, FolderOpen, Zap } from 'lucide-react'

export default function ChatWelcome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Code2 size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">欢迎使用 codeOS</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          基于 Claude Code 的桌面 GUI 客户端
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
        <FeatureCard
          icon={FolderOpen}
          title="项目对话"
          desc="打开项目文件夹，与 Claude 协作开发"
        />
        <FeatureCard
          icon={Zap}
          title="Git 集成"
          desc="查看变更历史，轻松回滚到任意节点"
        />
        <FeatureCard
          icon={Code2}
          title="多模式"
          desc="代码、计划、提问三种模式灵活切换"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        点击左侧「+」新建对话，或选择一个已有会话
      </p>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-left">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
