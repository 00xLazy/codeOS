import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'

export async function GET() {
  const sessions = db.getAllSessions()
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCacheCreationTokens = 0
  let totalCacheReadTokens = 0
  let totalCost = 0
  const dailyMap = new Map<string, { inputTokens: number; outputTokens: number; cost: number }>()

  for (const session of sessions) {
    const messages = db.getMessages(session.id)
    for (const msg of messages) {
      const i = msg.inputTokens || 0
      const o = msg.outputTokens || 0
      const cc = msg.cacheCreationTokens || 0
      const cr = msg.cacheReadTokens || 0
      totalInputTokens += i
      totalOutputTokens += o
      totalCacheCreationTokens += cc
      totalCacheReadTokens += cr

      // Cost estimation (claude-opus-4-6 pricing)
      const cost = (i / 1_000_000) * 15 + (o / 1_000_000) * 75
      totalCost += cost

      const date = new Date(msg.createdAt).toISOString().split('T')[0]
      if (!dailyMap.has(date)) dailyMap.set(date, { inputTokens: 0, outputTokens: 0, cost: 0 })
      const day = dailyMap.get(date)!
      day.inputTokens += i
      day.outputTokens += o
      day.cost += cost
    }
  }

  const dailyUsage = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  return NextResponse.json({
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreationTokens,
    totalCacheReadTokens,
    totalCost,
    sessionCount: sessions.length,
    dailyUsage,
  })
}
