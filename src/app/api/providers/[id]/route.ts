import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { ApiProvider } from '@/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as Partial<ApiProvider>
  const existing = db.getProviders().find((p) => p.id === id)
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })
  db.upsertProvider({ ...existing, ...body })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  db.deleteProvider(id)
  return NextResponse.json({ ok: true })
}
