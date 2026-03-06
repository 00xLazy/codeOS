# codeOS

A desktop GUI client for Claude Code — chat, code, and manage projects through a polished visual interface.

## Features

- **Conversational coding** — Stream responses from Claude in real time with full Markdown rendering, syntax-highlighted code blocks, and tool-call visualization
- **Session management** — Create, rename, archive, and resume chat sessions with local SQLite persistence
- **Project-aware context** — Pick a working directory per session with live file tree and file previews
- **Git integration** — View status, log, diff with syntax highlighting; rollback to any checkpoint
- **Resizable panels** — Drag to adjust chat list and right panel widths
- **File & image attachments** — Attach files and images directly in the chat input
- **Permission controls** — Approve, deny, or auto-allow tool use on a per-action basis
- **Multiple interaction modes** — Switch between Code, Plan, and Ask modes
- **Model selector** — Switch between Claude models (Opus, Sonnet, Haiku) mid-conversation
- **MCP server management** — Add, configure, and remove Model Context Protocol servers
- **Custom skills** — Define reusable prompt-based skills (global or per-project)
- **Settings editor** — Visual editors for theme, font size, model, language, auto-approve
- **Dark / Light theme** — One-click theme toggle with system preference support
- **Checkpoint rollback** — Rollback conversation to any previous message (from ClaudeCodex)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Desktop shell | Electron 40 |
| UI components | Radix UI + Tailwind CSS 4 |
| Database | better-sqlite3 (WAL mode) |
| AI integration | Claude Agent SDK |
| Markdown | react-markdown + remark-gfm + rehype-raw + Shiki |
| Icons | Lucide React |

## Prerequisites

- **Node.js** 18+
- **Claude Code CLI** — Installed and authenticated (`claude --version` should work)
- **npm** 9+

## Quick Start

```bash
# Clone the repository
git clone https://github.com/00xLazy/codeOS.git
cd codeOS

# Install dependencies
npm install

# Start in development mode
npm run electron:dev
```

## Development

```bash
# Run Next.js dev server only (opens in browser)
npm run dev

# Build Electron main process
node scripts/build-electron.mjs

# Run the full Electron app in dev mode
npm run electron:dev

# Production build
npm run build

# Build Electron distributable
npm run electron:build

# Package for specific platforms
npm run electron:pack:mac     # macOS DMG (arm64 + x64)
npm run electron:pack:win     # Windows NSIS installer
npm run electron:pack:linux   # Linux AppImage, deb, rpm
```

## Project Structure

```
codeOS/
├── electron/                 # Electron main process
│   ├── main.ts               # Window creation, embedded server lifecycle
│   ├── preload.ts            # Context bridge
│   ├── claude-handlers.ts    # Claude Agent SDK streaming
│   ├── git-handlers.ts       # Git operations
│   └── update-handlers.ts    # Auto-update
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── chat/             # Chat session pages
│   │   ├── settings/         # Settings editor
│   │   ├── extensions/       # Skills + MCP server management
│   │   └── api/              # REST + SSE endpoints
│   ├── components/
│   │   ├── layout/           # AppShell, NavRail, panels
│   │   ├── chat/             # ChatView, MessageList, MessageInput
│   │   ├── project/          # FileTree, GitPanel, TaskPanel
│   │   ├── skills/           # SkillsManager
│   │   └── plugins/          # McpManager
│   ├── lib/
│   │   ├── db.ts             # SQLite schema, migrations, CRUD
│   │   └── utils.ts          # Shared utilities
│   └── types/                # TypeScript interfaces
├── scripts/
│   ├── build-electron.mjs    # Electron build script
│   └── electron-dev.mjs      # Dev mode launcher
└── electron-builder.yml      # Packaging configuration
```

## Database Schema

12 tables in SQLite (WAL mode):

- `chat_sessions` — Session metadata
- `messages` — Messages with content blocks
- `settings` — Key-value settings
- `api_providers` — API provider configurations
- `skills` — Custom skills
- `mcp_servers` — MCP server configurations
- `tasks` — Task tracking
- `checkpoints` — Conversation checkpoints

Data directory: `~/.codeos/` (production) or `./data/` (dev)

## License

MIT

## Credits

Inspired by [ClaudeCodex](https://github.com/claudecodex/claudecodex) and [CodePilot](https://github.com/op7418/CodePilot).
