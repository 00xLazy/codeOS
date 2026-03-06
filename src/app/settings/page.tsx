'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import type { AppSettings } from '@/types'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const { setTheme } = useTheme()

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setSettings)
  }, [])

  async function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (key === 'theme') setTheme(value as string)
  }

  if (!settings) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-semibold mb-6">设置</h1>

      <Section title="外观">
        <Row label="主题">
          <SegmentedControl
            value={settings.theme}
            options={[
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'system', label: '跟随系统' },
            ]}
            onChange={(v) => update('theme', v as AppSettings['theme'])}
          />
        </Row>
        <Row label="字体大小">
          <SegmentedControl
            value={settings.fontSize}
            options={[
              { value: 'sm', label: '小' },
              { value: 'md', label: '中' },
              { value: 'lg', label: '大' },
            ]}
            onChange={(v) => update('fontSize', v as AppSettings['fontSize'])}
          />
        </Row>
        <Row label="显示时间戳">
          <Toggle
            value={settings.showTimestamps}
            onChange={(v) => update('showTimestamps', v)}
          />
        </Row>
      </Section>

      <Section title="行为">
        <Row label="新消息自动滚动">
          <Toggle
            value={settings.autoScroll}
            onChange={(v) => update('autoScroll', v)}
          />
        </Row>
        <Row label="自动批准所有操作" desc="危险：跳过所有权限确认">
          <Toggle
            value={settings.autoApprove}
            onChange={(v) => update('autoApprove', v)}
          />
        </Row>
      </Section>

      <Section title="模型">
        <Row label="默认模型">
          <select
            value={settings.defaultModel}
            onChange={(e) => update('defaultModel', e.target.value)}
            className="text-xs bg-muted border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="claude-opus-4-6">claude-opus-4-6</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
            <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
          </select>
        </Row>
      </Section>

      <Section title="语言">
        <Row label="界面语言">
          <SegmentedControl
            value={settings.language}
            options={[
              { value: 'zh', label: '中文' },
              { value: 'en', label: 'English' },
            ]}
            onChange={(v) => update('language', v as AppSettings['language'])}
          />
        </Row>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card">
      <div>
        <p className="text-sm">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1 text-xs transition-colors',
            opt.value === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-muted border border-border'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
          value ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
