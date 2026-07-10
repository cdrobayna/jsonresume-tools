import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * Walks up from `cwd` looking for `node_modules/.bin/<binName>` — the same resolution order
 * package managers use for local/workspace-installed CLI tools, so a project's pinned version
 * of a tool wins over anything global.
 */
export function findLocalBin(binName: string, cwd: string): string | undefined {
  let dir = path.resolve(cwd)
  while (true) {
    const candidate = path.join(dir, 'node_modules', '.bin', binName)
    if (existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/**
 * Minimal `which`-style PATH search — returns the first directory in `PATH` containing an
 * executable named `binName`, or undefined.
 */
export function findOnPath(binName: string): string | undefined {
  const pathEnv = process.env.PATH ?? ''
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue
    const candidate = path.join(dir, binName)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

export interface ResolvedBin {
  execPath: string
  source: 'workspace' | 'path'
}

/**
 * Resolves a binary name to an absolute path: local workspace `node_modules/.bin` first (so a
 * project's pinned version wins), falling back to `PATH` (global installs). Shared by tool
 * resolution (`resolve.ts`) and Chromium detection (`env.ts`) so the search order lives in one
 * place.
 */
export function resolveBin(binName: string, cwd: string): ResolvedBin | undefined {
  const local = findLocalBin(binName, cwd)
  if (local) return { execPath: local, source: 'workspace' }
  const onPath = findOnPath(binName)
  if (onPath) return { execPath: onPath, source: 'path' }
  return undefined
}
