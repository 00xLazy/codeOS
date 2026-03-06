import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { Message } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const messages = db.getMessages(id)
  return NextResponse.json(messages)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const msg: Message = await req.json()
  db.insertMessage({ ...msg, sessionId: id })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { afterMessageId } = await req.json()
  db.deleteMessagesAfter(id, afterMessageId)
  return NextResponse.json({ ok: true })
}
