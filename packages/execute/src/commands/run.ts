import { CliUsageError, type CommandResult } from '@jsonresume-tools/core'
import { detectPackageManager, installCommand } from '../pm.js'
import { REGISTRY, resolveTool, type ToolId } from '../resolve.js'
import { spawnTee } from '../spawn.js'
import type { SpawnFn } from '../spawn.js'
import { resolveBin } from '../which.js'

export interface RunRunDeps {
  spawn?: SpawnFn
  cwd?: string
}

function isToolId(value: string): value is ToolId {
  return value in REGISTRY
}

/**
 * `jrx run <tool> [-- <args...>]` — npx-style passthrough. `<tool>` may be one of the
 * registered ids (`lint`/`parity`/`tailor`/`resume`, resolved with the same install-hint
 * behavior every other command uses) or an arbitrary binary name resolved via the same
 * local-then-PATH lookup. Everything after `<tool>` (an optional leading `--` is stripped) is
 * forwarded to the resolved binary verbatim, with output streamed live.
 */
export async function runRun(argv: string[], deps: RunRunDeps = {}): Promise<CommandResult> {
  const [target, ...rest] = argv
  if (!target) throw new CliUsageError('run requires a tool name, e.g. "jrx run tailor -- list"')
  const passthrough = rest[0] === '--' ? rest.slice(1) : rest

  const cwd = deps.cwd ?? process.cwd()
  const spawn = deps.spawn ?? spawnTee

  if (isToolId(target)) {
    const tool = resolveTool(target, { cwd })
    if (!tool) {
      const entry = REGISTRY[target]
      const pm = detectPackageManager(cwd)
      throw new CliUsageError(`${entry.pkg} not found. Install it with:\n  ${installCommand(pm, [entry.pkg])}`)
    }
    const result = await spawn(tool.execPath, passthrough, { cwd })
    return { code: result.code }
  }

  const resolved = resolveBin(target, cwd)
  if (!resolved) throw new CliUsageError(`"${target}" not found on PATH or in node_modules/.bin`)
  const result = await spawn(resolved.execPath, passthrough, { cwd })
  return { code: result.code }
}
