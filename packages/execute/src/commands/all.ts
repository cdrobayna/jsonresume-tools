import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { CliUsageError, type CommandResult, parseFlags } from '@jsonresume-tools/core'
import { chromiumEnv } from '../env.js'
import { discoverMasters } from '../matrix.js'
import { aggregate, formatReport, type StepResult } from '../report.js'
import { requireTool } from '../resolve.js'
import { spawnGate } from '../spawn.js'
import type { SpawnFn } from '../spawn.js'
import { runBuild } from './build.js'
import { runCheck } from './check.js'

export interface RunAllDeps {
  spawn?: SpawnFn
  cwd?: string
}

async function discoverMatrixFiles(cwd: string, outDir: string): Promise<string[]> {
  try {
    const names = await readdir(path.join(cwd, outDir))
    return names.filter((n) => n.endsWith('.json')).map((n) => path.join(outDir, n))
  } catch {
    return []
  }
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
    ['masters', 'lang', 'variants-dir', 'out-dir', 'theme', 'format'],
    ['verbose', 'dry-run', 'quiet'],
    { v: 'verbose', n: 'dry-run', q: 'quiet' }
  )
  const cwd = deps.cwd ?? process.cwd()
  const spawn = deps.spawn ?? spawnGate
  const verbose = booleans.has('verbose')
  const dryRun = booleans.has('dry-run')
  const outDir = flags['out-dir'] ?? 'dist'
  const exportFormat = flags.format ?? 'pdf'

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
  if (flags.theme) checkArgs.push('--theme', flags.theme)

  const buildResult = await runBuild(buildArgs, deps)
  const checkResult = await runCheck(checkArgs, deps)

  const steps: StepResult[] = [
    { label: 'build', tool: 'tailor', code: buildResult.code, stdout: buildResult.stdout, stderr: buildResult.stderr },
    { label: 'check', tool: 'multi', code: checkResult.code, stdout: checkResult.stdout, stderr: checkResult.stderr }
  ]

  if (!flags.theme) {
    steps.push({ label: 'export', tool: 'resume', code: 0, skipped: true, stdout: 'no --theme given — skipped (pass --theme to export PDFs/HTML)' })
  } else {
    const resumeTool = requireTool('resume', { cwd })
    const env = chromiumEnv()
    if (!env) {
      throw new CliUsageError(
        "no Chromium/Chrome found for `resume export` (needed by resume-cli's Puppeteer-based renderer). " +
          'Install Chromium/Chrome or set PUPPETEER_EXECUTABLE_PATH.'
      )
    }

    const masters = await discoverMasters(cwd)
    const matrixFiles = await discoverMatrixFiles(cwd, outDir)
    const targets = [...masters.map((m) => m.path), ...matrixFiles]

    for (const file of targets) {
      if (dryRun) {
        steps.push({ label: `export (${file})`, tool: 'resume', code: 0, skipped: true, stdout: `(dry run) would export ${file}` })
        continue
      }
      const slug = path.basename(file).replace(/\.json$/, '')
      const outPath = path.join(outDir, `cv.${slug}.${exportFormat}`)
      const result = await spawn(resumeTool.execPath, ['export', outPath, '--theme', flags.theme, '--resume', file], {
        cwd,
        env: { ...process.env, ...env }
      })
      steps.push({ label: `export (${file})`, tool: 'resume', code: result.code, stdout: result.stdout, stderr: result.stderr })
    }
  }

  const report = aggregate(steps)
  return { code: report.code, stdout: formatReport(report, { verbose }) }
}
