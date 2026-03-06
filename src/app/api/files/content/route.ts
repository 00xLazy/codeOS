import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 })

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return NextResponse.json({ content })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
