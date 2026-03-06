import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { McpServer } from '@/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as Partial<McpServer>
  const existing = db.getMcpServers().find((s) => s.id === id)
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  db.upsertMcpServer({ ...existing, ...body })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  db.deleteMcpServer(id)
  return NextResponse.json({ ok: true })
}
