// Stub for Electron main process DB access
// The actual DB logic is shared with the Next.js layer via the API routes.
// Electron IPC handlers read from the same SQLite file.

export function init(_dataDir: string) {
  // DB initialization happens in src/lib/db.ts via the Next.js process
}
