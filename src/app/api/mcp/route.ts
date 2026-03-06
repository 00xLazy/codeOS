import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { McpServer } from '@/types'

export async function GET() {
  return NextResponse.json(db.getMcpServers())
}

export async function POST(req: NextRequest) {
  const server: McpServer = await req.json()
  db.upsertMcpServer(server)
  return NextResponse.json(server)
}
