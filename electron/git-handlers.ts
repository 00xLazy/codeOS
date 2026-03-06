import type { IpcMain, BrowserWindow } from 'electron'
import { execSync, execFile } from 'child_process'
import type { GitStatus, GitCommit } from '../src/types'

export function setupGitHandlers(ipcMain: IpcMain) {
  ipcMain.handle('git:status', (_e, dir: string): GitStatus => {
    try {
      const branch = execSync('git branch --show-current', { cwd: dir }).toString().trim()
      const statusOut = execSync('git status --porcelain=v1', { cwd: dir }).toString()
      const aheadBehind = (() => {
        try {
          const out = execSync('git rev-list --count --left-right @{u}...HEAD', {
            cwd: dir,
          }).toString().trim()
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
        const filePath = line.slice(3)
        if (x === '?' && y === '?') {
          untracked.push(filePath)
        } else {
          if (x !== ' ' && x !== '?') staged.push({ path: filePath, status: x as never })
          if (y !== ' ' && y !== '?') unstaged.push({ path: filePath, status: y as never })
        }
      }

      return { branch: branch || 'HEAD', staged, unstaged, untracked, ...aheadBehind }
    } catch {
      return { branch: 'unknown', staged: [], unstaged: [], untracked: [], ahead: 0, behind: 0 }
    }
  })

  ipcMain.handle('git:log', (_e, dir: string, limit = 50): GitCommit[] => {
    try {
      const out = execSync(
        `git log --pretty=format:"%H|%h|%s|%an|%ar|%D" -n ${limit}`,
        { cwd: dir }
      ).toString()
      return out
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, shortHash, subject, author, date, refs] = line.split('|')
          return { hash, shortHash, subject, author, date, refs: refs || undefined }
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('git:show', (_e, dir: string, hash: string): string => {
    try {
      return execSync(`git show ${hash}`, { cwd: dir, maxBuffer: 5 * 1024 * 1024 }).toString()
    } catch {
      return ''
    }
  })

  ipcMain.handle('git:diff', (_e, dir: string, hash?: string): string => {
    try {
      const cmd = hash ? `git show ${hash}` : 'git diff'
      return execSync(cmd, { cwd: dir, maxBuffer: 5 * 1024 * 1024 }).toString()
    } catch {
      return ''
    }
  })
}
