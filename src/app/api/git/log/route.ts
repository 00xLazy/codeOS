import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import type { GitCommit } from '@/types'

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('dir')
  const limit = req.nextUrl.searchParams.get('limit') || '50'
  if (!dir) return NextResponse.json({ error: 'dir required' }, { status: 400 })

  try {
    const out = execSync(
      `git log --pretty=format:"%H|%h|%s|%an|%ar|%D" -n ${limit}`,
      { cwd: dir }
    ).toString()

    const commits: GitCommit[] = out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, subject, author, date, refs] = line.split('|')
        return { hash, shortHash, subject, author, date, refs: refs || undefined }
      })

    return NextResponse.json(commits)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
