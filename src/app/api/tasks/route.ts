import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json([])
  return NextResponse.json(db.getTasks(sessionId))
}
