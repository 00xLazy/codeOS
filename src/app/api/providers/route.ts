import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { ApiProvider } from '@/types'
import { nanoid } from 'nanoid'

export async function GET() {
  return NextResponse.json(db.getProviders())
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<ApiProvider, 'id' | 'createdAt'>
  const provider: ApiProvider = { ...body, id: nanoid(), createdAt: Date.now() }
  db.upsertProvider(provider)
  return NextResponse.json(provider)
}
