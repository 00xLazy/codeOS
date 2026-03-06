import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('dir')
  const hash = req.nextUrl.searchParams.get('hash')
  if (!dir) return NextResponse.json({ error: 'dir required' }, { status: 400 })

  try {
    const cmd = hash ? `git show ${hash}` : 'git diff'
    const diff = execSync(cmd, { cwd: dir, maxBuffer: 1024 * 1024 * 5 }).toString()
    return NextResponse.json({ diff })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
