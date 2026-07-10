import { createInterface } from 'node:readline/promises'
import { type CommandResult, parseFlags } from '@jsonresume-tools/core'
import { detectPackageManager, installCommand } from '../pm.js'
import { REGISTRY, resolveTool, type ToolId } from '../resolve.js'
import { spawnTee } from '../spawn.js'
import type { SpawnFn } from '../spawn.js'

export interface RunSetupDeps {
  spawn?: SpawnFn
  cwd?: string
  /** Injectable confirmation prompt for testing; defaults to a real readline y/N prompt. */
  confirm?: (message: string) => Promise<boolean>
}

const TOOL_ORDER: ToolId[] = ['lint', 'parity', 'tailor', 'resume']

async function defaultConfirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`${message} [y/N] `)
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    rl.close()
  }
}

/**
 * `jrx setup` — print-and-confirm install of whichever recommended tools aren't already
 * resolvable: shows the exact PM-aware command and only runs it after confirmation
 * (`--yes` skips the prompt, `--dry-run` only prints, `--global` installs globally instead of
 * as a dev dependency). Never installs silently.
 */
export async function runSetup(argv: string[], deps: RunSetupDeps = {}): Promise<CommandResult> {
  const { booleans } = parseFlags(argv, [], ['yes', 'dry-run', 'global'], { y: 'yes', n: 'dry-run', g: 'global' })
  const cwd = deps.cwd ?? process.cwd()
  const spawn = deps.spawn ?? spawnTee
  const confirm = deps.confirm ?? defaultConfirm

  const missing = TOOL_ORDER.filter((id) => !resolveTool(id, { cwd }))
  if (missing.length === 0) {
    return { code: 0, stdout: 'All recommended tools are already installed.' }
  }

  const pkgs = missing.map((id) => REGISTRY[id].pkg)
  const pm = detectPackageManager(cwd)
  const global = booleans.has('global')
  const cmd = installCommand(pm, pkgs, { global })

  if (booleans.has('dry-run')) {
    return { code: 0, stdout: `Would run: ${cmd}` }
  }

  if (!booleans.has('yes')) {
    const proceed = await confirm(`Will run: ${cmd}\nProceed?`)
    if (!proceed) {
      return { code: 0, stdout: 'Aborted — nothing installed.' }
    }
  }

  const [bin, ...args] = cmd.split(' ')
  const result = await spawn(bin, args, { cwd })
  return result.code === 0
    ? { code: 0, stdout: `Installed: ${pkgs.join(', ')}` }
    : { code: result.code, stderr: `install command failed (exit ${result.code}): ${cmd}` }
}
