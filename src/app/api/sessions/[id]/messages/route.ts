import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const messages = db.getMessages(id)
  return NextResponse.json(messages)
}
