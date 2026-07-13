import path from 'node:path'
import { type CommandResult, parseFlags } from '@jsonresume-tools/core'
import { chromiumEnv } from '../env.js'
import { discoverMasters, discoverMatrixFiles } from '../matrix.js'
import { aggregate, formatReport, type StepResult } from '../report.js'
import { requireTool } from '../resolve.js'
import { spawnGate } from '../spawn.js'
import type { SpawnFn } from '../spawn.js'
import { resolveTheme } from '../theme.js'
import { runBuild } from './build.js'
import { runCheck } from './check.js'

export interface RunAllDeps {
  spawn?: SpawnFn
  cwd?: string
}

/**
 * `jrx all` — the full pipeline: `build` (matrix tailoring) -> `check` (aggregated QA gate,
 * which itself runs the ATS audit when `--theme` is given) -> `export` (PDF/HTML rendering via
 * resume-cli, when `--theme` is given). One aggregated report, one exit code.
 *
 * Re-parses argv once and hands each sub-stage a clean, explicit argv of only the flags it
 * supports, rather than forwarding the raw argv — `build` and `check` declare different flag
 * sets, so blind forwarding would trip `parseFlags`'s "unknown flag" check.
 */
export async function runAll(argv: string[], deps: RunAllDeps = {}): Promise<CommandResult> {
  const { flags, booleans } = parseFlags(
    argv,
    ['masters', 'lang', 'variants-dir', 'out-dir', 'theme', 'format', 'config'],
    ['verbose', 'dry-run', 'quiet'],
    { v: 'verbose', n: 'dry-run', q: 'quiet', c: 'config' }
  )
  const cwd = deps.cwd ?? process.cwd()
  const spawn = deps.spawn ?? spawnGate
  const verbose = booleans.has('verbose')
  const dryRun = booleans.has('dry-run')
  const outDir = flags['out-dir'] ?? 'dist'
  const exportFormat = flags.format ?? 'pdf'
  const theme = await resolveTheme(flags, cwd)

  const commonArgs: string[] = ['--out-dir', outDir]
  if (flags.masters) commonArgs.push('--masters', flags.masters)
  if (flags.lang) commonArgs.push('--lang', flags.lang)
  if (flags['variants-dir']) commonArgs.push('--variants-dir', flags['variants-dir'])

  const buildArgs = [...commonArgs]
  if (verbose) buildArgs.push('--verbose')
  if (booleans.has('quiet')) buildArgs.push('--quiet')
  if (dryRun) buildArgs.push('--dry-run')

  const checkArgs = [...commonArgs]
  if (verbose) checkArgs.push('--verbose')
  if (theme) checkArgs.push('--theme', theme)

  const buildResult = await runBuild(buildArgs, deps)
  const checkResult = await runCheck(checkArgs, deps)

  const steps: StepResult[] = [
    { label: 'build', tool: 'tailor', code: buildResult.code, stdout: buildResult.stdout, stderr: buildResult.stderr },
    // `checkResult.stdout` is `runCheck`'s own already-formatted multi-line report (each of its
    // sub-steps' `[STATUS] label` lines, including any audit score `summary`) collapsed into one
    // opaque blob here. That blob is only shown below when THIS "check" step fails or `--verbose`
    // is passed to `all` — so a per-file audit score summary doesn't surface in a passing,
    // non-verbose `jrx all` run even though `jrx check` alone would show it. Flattening `check`'s
    // sub-steps into `all`'s own `steps` (or moving to a structured report format) would fix that,
    // but is out of scope here — tracked separately.
    { label: 'check', tool: 'multi', code: checkResult.code, stdout: checkResult.stdout, stderr: checkResult.stderr }
  ]

  if (!theme) {
    steps.push({
      label: 'export',
      tool: 'resume',
      code: 0,
      skipped: true,
      stdout: "no theme resolved — skipped (pass --theme, or set one in a .jsonresumetoolsrc file's \"execute\" section, to export PDFs/HTML)"
    })
  } else {
    const resumeTool = requireTool('resume', { cwd })
    // No hard gate here: when chromiumEnv() finds nothing, we pass process.env through
    // unmodified and let resume-cli's own Puppeteer resolve its bundled/downloaded Chrome,
    // exactly as it does standalone. Only override when a system Chromium was explicitly found.
    const chromiumOverride = chromiumEnv()

    const masters = await discoverMasters(cwd)
    const matrixFiles = await discoverMatrixFiles(cwd, outDir)
    // Masters slug by locale alone (cv.en.pdf) — their basename is always the fixed "resume"
    // literal, so including it would be redundant. Matrix files slug by their full basename
    // (cv.backend.en.pdf) since role + locale are both needed to stay unambiguous.
    const exportTargets = [
      ...masters.map((m) => ({ path: m.path, slug: m.lang ?? path.basename(m.path, '.json') })),
      ...matrixFiles.map((f) => ({ path: f, slug: path.basename(f, '.json') }))
    ]

    for (const target of exportTargets) {
      if (dryRun) {
        steps.push({ label: `export (${target.path})`, tool: 'resume', code: 0, skipped: true, stdout: `(dry run) would export ${target.path}` })
        continue
      }
      const outPath = path.join(outDir, `cv.${target.slug}.${exportFormat}`)
      const result = await spawn(resumeTool.execPath, ['export', outPath, '--theme', theme, '--resume', target.path], {
        cwd,
        env: { ...process.env, ...chromiumOverride }
      })
      steps.push({ label: `export (${target.path})`, tool: 'resume', code: result.code, stdout: result.stdout, stderr: result.stderr })
    }
  }

  const report = aggregate(steps)
  return { code: report.code, stdout: formatReport(report, { verbose }) }
}
