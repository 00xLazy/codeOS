import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import type { Skill } from '@/types'

export async function GET() {
  return NextResponse.json(db.getSkills())
}

export async function POST(req: NextRequest) {
  const skill: Skill = await req.json()
  db.upsertSkill(skill)
  return NextResponse.json(skill)
}
