import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
import { detectPackageManager, installCommand } from './pm.js'
import { resolveBin } from './which.js'

const requireFromHere = createRequire(import.meta.url)

export type ToolId = 'lint' | 'parity' | 'tailor' | 'resume'

export interface ToolRegistryEntry {
  id: ToolId
  /** Binary names to look for, in priority order (full name first, short alias second). */
  bins: string[]
  /** The npm package that provides this tool — used to build install hints. */
  pkg: string
  /** One-line description shown by `jrx doctor`. */
  describe: string
}

/**
 * The tools `jrx` knows how to detect and orchestrate. Deliberately does NOT list these as
 * dependencies of `jsonresume-execute` — they're detected and spawned, never bundled or
 * imported, which is what keeps `jrx` from coupling the independent tools to one another.
 */
export const REGISTRY: Record<ToolId, ToolRegistryEntry> = {
  lint: {
    id: 'lint',
    bins: ['jsonresume-lint', 'jrl'],
    pkg: 'jsonresume-lint',
    describe: 'Per-file JSON Resume quality checks'
  },
  parity: {
    id: 'parity',
    bins: ['jsonresume-parity', 'jrp'],
    pkg: 'jsonresume-parity',
    describe: 'Multi-locale parity checks'
  },
  tailor: {
    id: 'tailor',
    bins: ['jsonresume-tailor', 'jrt'],
    pkg: 'jsonresume-tailor',
    describe: 'Role-tailored resume variants'
  },
  resume: {
    id: 'resume',
    bins: ['resume'],
    pkg: 'resume-cli',
    describe: 'Official JSON Resume CLI (validate/export/audit)'
  }
}

export interface ResolvedTool {
  id: ToolId
  /** Absolute path to the resolved executable. */
  execPath: string
  /** Where it was found. */
  source: 'workspace' | 'path'
  /** Best-effort version string, or undefined if it could not be determined. */
  version?: string
}

/** Walks up from `startPath`'s (resolved) directory to find the nearest `package.json` and reads its `version`. */
function readVersionNear(startPath: string): string | undefined {
  try {
    let dir = path.dirname(realpathSync(startPath))
    while (true) {
      const pkgPath = path.join(dir, 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string }
        return pkg.version
      }
      const parent = path.dirname(dir)
      if (parent === dir) return undefined
      dir = parent
    }
  } catch {
    return undefined
  }
}

/**
 * Resolves `pkgName`'s version the reliable way: through Node's own module resolution (by
 * package *name*, searching from `cwd`), then walking up from its resolved main entry file to
 * find that package's own `package.json`.
 *
 * This is NOT redundant with `readVersionNear(execPath)` below — pnpm (and other package
 * managers) commonly generate `node_modules/.bin/<bin>` entries as small shim scripts rather
 * than symlinks into the real package. A shim is a plain file sitting directly in `.bin/`, so
 * walking up from *its* path finds nothing useful and silently lands on the consuming
 * project's own `package.json` instead — reporting the wrong version entirely, not just an
 * imprecise one. Resolving by name sidesteps that: Node's resolver already knows how to find a
 * package's real directory regardless of how (or whether) its bin is a symlink.
 */
function resolvePackageVersion(pkgName: string, cwd: string): string | undefined {
  // Only trust name-based resolution when cwd's own node_modules actually declares this
  // package — as a real directory (npm/hoisted installs) or a symlink (pnpm's virtual store,
  // or a `link:`/workspace dependency, which legitimately resolves OUTSIDE cwd entirely).
  // Checking existence here (not where the resolved file ends up) is what makes this work for
  // all three layouts; a path-prefix check on the resolved target would wrongly reject a
  // `link:` dependency. It also guards against a same-named package resolving from somewhere
  // else on the module path (global folders, a bundler's own module graph in test runners).
  if (!existsSync(path.join(cwd, 'node_modules', pkgName))) return undefined
  try {
    const mainEntry = requireFromHere.resolve(pkgName, { paths: [cwd] })
    return readVersionNear(mainEntry)
  } catch {
    return undefined
  }
}

/** Last-resort version lookup for a resolved binary that isn't sitting under a readable `package.json`. */
function probeVersion(execPath: string): string | undefined {
  try {
    const out = execFileSync(execPath, ['--version'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] })
    const trimmed = out.trim()
    return trimmed || undefined
  } catch {
    return undefined
  }
}

export interface ResolveOptions {
  cwd?: string
}

/** Resolves a registered tool to an executable path + best-effort version, or `null` if it isn't installed. */
export function resolveTool(id: ToolId, opts: ResolveOptions = {}): ResolvedTool | null {
  const entry = REGISTRY[id]
  const cwd = opts.cwd ?? process.cwd()

  for (const binName of entry.bins) {
    const found = resolveBin(binName, cwd)
    if (found) {
      const version = resolvePackageVersion(entry.pkg, cwd) ?? readVersionNear(found.execPath) ?? probeVersion(found.execPath)
      return { id, execPath: found.execPath, source: found.source, version }
    }
  }

  return null
}

/**
 * Resolves a registered tool, throwing a `CliUsageError` with a clear, PM-aware install hint
 * when it isn't found — the standard "not bundled, detect it, tell the user how to install it"
 * behavior every `jrx` command relies on.
 */
export function requireTool(id: ToolId, opts: ResolveOptions = {}): ResolvedTool {
  const tool = resolveTool(id, opts)
  if (tool) return tool
  const entry = REGISTRY[id]
  const pm = detectPackageManager(opts.cwd)
  const cmd = installCommand(pm, [entry.pkg])
  throw new CliUsageError(`${entry.pkg} not found (needed for "${entry.describe}"). Install it with:\n  ${cmd}`)
}
