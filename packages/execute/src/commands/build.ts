import { type CommandResult, extractLocale, parseFlags } from '@jsonresume-tools/core'
import { discoverMasters, resolveVariantsDir } from '../matrix.js'
import { requireTool } from '../resolve.js'
import { spawnGate } from '../spawn.js'
import type { SpawnFn } from '../spawn.js'

export interface RunBuildDeps {
  spawn?: SpawnFn
  cwd?: string
}

/**
 * `jrx build` — the matrix tailoring command. Fans `jsonresume-tailor build --variants-dir`
 * out over every discovered master (one per language), so a full `{role}.{lang}.json` matrix
 * comes from a single invocation instead of one `jrt build` per language by hand.
 */
export async function runBuild(argv: string[], deps: RunBuildDeps = {}): Promise<CommandResult> {
  const { flags, booleans } = parseFlags(
    argv,
    ['masters', 'variants-dir', 'out-dir', 'lang'],
    ['dry-run', 'verbose', 'quiet'],
    { d: 'variants-dir', O: 'out-dir', n: 'dry-run', v: 'verbose', q: 'quiet' }
  )

  const cwd = deps.cwd ?? process.cwd()
  const spawn = deps.spawn ?? spawnGate
  const dryRun = booleans.has('dry-run')
  const verbose = booleans.has('verbose')
  const quiet = booleans.has('quiet')
  const outDir = flags['out-dir'] ?? 'dist'
  const overrides = flags['variants-dir'] ? flags['variants-dir'].split(',') : []
  const langFilter = flags.lang ? new Set(flags.lang.split(',')) : undefined

  let masters = flags.masters
    ? flags.masters.split(',').map((p) => ({ lang: extractLocale(p), path: p }))
    : await discoverMasters(cwd)

  if (langFilter) {
    masters = masters.filter((m) => m.lang && langFilter.has(m.lang))
  }

  if (masters.length === 0) {
    return {
      code: 0,
      stdout: 'no master resume files found (expected resume.json or resume.<lang>.json; pass --masters to override)'
    }
  }

  const tailor = requireTool('tailor', { cwd })

  const lines: string[] = []
  const warnings: string[] = []
  let worst = 0

  for (const master of masters) {
    const variantsDir = await resolveVariantsDir(master.lang, overrides, cwd)
    const args = ['build', '--variants-dir', variantsDir, '--resume', master.path, '--out-dir', outDir]
    if (dryRun) args.push('--dry-run')
    if (verbose) args.push('--verbose')
    if (quiet) args.push('--quiet')

    const result = await spawn(tailor.execPath, args, { cwd })
    worst = Math.max(worst, result.code)
    if (result.stdout) lines.push(result.stdout)
    if (result.stderr) warnings.push(result.stderr)
  }

  return {
    code: worst,
    stdout: lines.join('\n\n'),
    stderr: warnings.length > 0 ? warnings.join('\n') : undefined
  }
}
