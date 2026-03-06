import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import type { GitStatus } from '@/types'

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('dir')
  if (!dir) return NextResponse.json({ error: 'dir required' }, { status: 400 })

  try {
    const branchOut = execSync('git branch --show-current', { cwd: dir }).toString().trim()
    const statusOut = execSync('git status --porcelain=v1', { cwd: dir }).toString()
    const aheadBehind = (() => {
      try {
        const out = execSync('git rev-list --count --left-right @{u}...HEAD', { cwd: dir }).toString().trim()
        const [b, a] = out.split('\t').map(Number)
        return { ahead: a || 0, behind: b || 0 }
      } catch {
        return { ahead: 0, behind: 0 }
      }
    })()

    const staged: GitStatus['staged'] = []
    const unstaged: GitStatus['unstaged'] = []
    const untracked: string[] = []

    for (const line of statusOut.split('\n').filter(Boolean)) {
      const x = line[0]
      const y = line[1]
      const path = line.slice(3)

      if (x === '?' && y === '?') {
        untracked.push(path)
      } else {
        if (x !== ' ' && x !== '?') staged.push({ path, status: x as never })
        if (y !== ' ' && y !== '?') unstaged.push({ path, status: y as never })
      }
    }

    const status: GitStatus = {
      branch: branchOut || 'HEAD',
      staged,
      unstaged,
      untracked,
      ...aheadBehind,
    }

    return NextResponse.json(status)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
