'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Skill } from '@/types'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'

export default function SkillsManager() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [selected, setSelected] = useState<Skill | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetch('/api/skills').then((r) => r.json()).then(setSkills)
  }, [])

  async function save(skill: Skill) {
    await fetch('/api/skills', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(skill),
    })
    const updated = await fetch('/api/skills').then((r) => r.json())
    setSkills(updated)
    setEditing(false)
    setSelected(skill)
  }

  async function remove(id: string) {
    await fetch(`/api/skills/${id}`, { method: 'DELETE' })
    setSkills((prev) => prev.filter((s) => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">技能列表</span>
          <button
            onClick={() => {
              setSelected(null)
              setEditing(true)
            }}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {skills.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">暂无技能</p>
          )}
          {skills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => { setSelected(skill); setEditing(false) }}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                selected?.id === skill.id ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">/{skill.name}</p>
                <p className="text-[10px] text-muted-foreground">{skill.scope === 'global' ? '全局' : '项目'}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(skill.id) }}
                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 p-4 overflow-y-auto">
        {editing ? (
          <SkillEditor
            initial={selected}
            onSave={save}
            onCancel={() => setEditing(false)}
          />
        ) : selected ? (
          <SkillDetail skill={selected} onEdit={() => setEditing(true)} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">从列表中选择一个技能或创建新技能</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SkillDetail({ skill, onEdit }: { skill: Skill; onEdit: () => void }) {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">/{skill.name}</h2>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"
        >
          <Pencil size={12} />
          编辑
        </button>
      </div>
      {skill.description && (
        <p className="text-xs text-muted-foreground">{skill.description}</p>
      )}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-1.5 bg-muted/30 border-b border-border">
          <span className="text-[10px] font-mono text-muted-foreground">提示词</span>
        </div>
        <pre className="px-3 py-2 text-xs whitespace-pre-wrap">{skill.prompt}</pre>
      </div>
    </div>
  )
}

function SkillEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Skill | null
  onSave: (s: Skill) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [desc, setDesc] = useState(initial?.description || '')
  const [prompt, setPrompt] = useState(initial?.prompt || '')
  const [scope, setScope] = useState<'global' | 'project'>(initial?.scope || 'global')

  function handleSave() {
    if (!name.trim() || !prompt.trim()) return
    onSave({
      id: initial?.id || nanoid(),
      name: name.trim(),
      description: desc.trim() || undefined,
      prompt: prompt.trim(),
      scope,
      projectDir: initial?.projectDir,
      createdAt: initial?.createdAt || Date.now(),
      updatedAt: Date.now(),
    })
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">{initial ? '编辑技能' : '创建技能'}</h2>

      <div className="space-y-3">
        <Field label="名称">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="skill-name"
            className="w-full text-xs bg-muted/30 border border-border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        <Field label="描述（可选）">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="描述这个技能的用途..."
            className="w-full text-xs bg-muted/30 border border-border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
          />
        </Field>

        <Field label="作用域">
          <div className="flex gap-2">
            {(['global', 'project'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs border transition-colors',
                  scope === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                {s === 'global' ? '全局' : '项目'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="提示词">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="输入技能提示词..."
            className="w-full text-xs bg-muted/30 border border-border rounded px-3 py-2 outline-none focus:ring-1 focus:ring-ring font-mono resize-y"
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || !prompt.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/80 disabled:opacity-40 transition-colors"
        >
          保存
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-accent transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
