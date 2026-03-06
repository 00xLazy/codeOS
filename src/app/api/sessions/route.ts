import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { ChatSession } from '@/types'

export async function GET(req: NextRequest) {
  const workDir = req.nextUrl.searchParams.get('workDir')
  const sessions = workDir ? db.getSessionsByDir(workDir) : db.getAllSessions()
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const session: ChatSession = await req.json()
  db.createSession(session)
  return NextResponse.json(session)
}
