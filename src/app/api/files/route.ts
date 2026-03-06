import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { FileNode } from '@/types'

const IGNORE = new Set(['.git', 'node_modules', '.next', 'dist', '.DS_Store', '__pycache__'])

function readTree(dir: string, depth = 0): FileNode[] {
  if (depth > 4) return []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries
      .filter((e) => !IGNORE.has(e.name) && !e.name.startsWith('.'))
      .map((e) => {
        const fullPath = path.join(dir, e.name)
        if (e.isDirectory()) {
          return {
            name: e.name,
            path: fullPath,
            type: 'directory' as const,
            children: readTree(fullPath, depth + 1),
          }
        }
        return { name: e.name, path: fullPath, type: 'file' as const }
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get('dir')
  if (!dir) return NextResponse.json({ error: 'dir required' }, { status: 400 })
  return NextResponse.json(readTree(dir))
}
