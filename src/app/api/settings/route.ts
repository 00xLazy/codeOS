import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'

export async function GET() {
  return NextResponse.json(db.getSettings())
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>
  for (const [key, value] of Object.entries(body)) {
    db.setSetting(key as keyof ReturnType<typeof db.getSettings>, value as never)
  }
  return NextResponse.json({ ok: true })
}
