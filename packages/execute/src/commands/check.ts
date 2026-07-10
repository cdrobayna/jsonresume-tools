import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { CliUsageError, type CommandResult, extractLocale, parseFlags } from '@jsonresume-tools/core'
import { chromiumEnv } from '../env.js'
import { discoverMasters, resolveVariantsDir, type MasterFile } from '../matrix.js'
import { aggregate, formatReport, type StepResult } from '../report.js'
import { requireTool } from '../resolve.js'
import { spawnGate } from '../spawn.js'
import type { SpawnFn } from '../spawn.js'

export interface RunCheckDeps {
  spawn?: SpawnFn
  cwd?: string
}

async function resolveMasters(flags: Record<string, string>, cwd: string): Promise<MasterFile[]> {
  const langFilter = flags.lang ? new Set(flags.lang.split(',')) : undefined
  let masters = flags.masters
    ? flags.masters.split(',').map((p) => ({ lang: extractLocale(p), path: p }))
    : await discoverMasters(cwd)
  if (langFilter) masters = masters.filter((m) => m.lang && langFilter.has(m.lang))
  return masters
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
 * `jrx check` — the aggregated QA gate. Runs lint, parity, tailor's own `check`, and (if
 * `--theme` is given) resume-cli's ATS `audit`, across every master and the already-built
 * variant matrix, then reports one pass/fail table with one overall exit code.
 *
 * Enabling lint's `schema` rule here — and not separately shelling out to `resume validate` —
 * is a deliberate de-duplication: both wrap the same official `@jsonresume/schema` validator.
 */
export async function runCheck(argv: string[], deps: RunCheckDeps = {}): Promise<CommandResult> {
  const { flags, booleans } = parseFlags(
    argv,
    ['masters', 'lang', 'variants-dir', 'out-dir', 'theme'],
    ['verbose'],
    { v: 'verbose' }
  )
  const cwd = deps.cwd ?? process.cwd()
  const spawn = deps.spawn ?? spawnGate
  const verbose = booleans.has('verbose')
  const overrides = flags['variants-dir'] ? flags['variants-dir'].split(',') : []
  const outDir = flags['out-dir'] ?? 'dist'

  const masters = await resolveMasters(flags, cwd)
  if (masters.length === 0) {
    return {
      code: 2,
      stderr: 'no master resume files found (expected resume.json or resume.<lang>.json; pass --masters to override)'
    }
  }

  const lintTool = requireTool('lint', { cwd })
  const tailorTool = requireTool('tailor', { cwd })

  const steps: StepResult[] = []
  const matrixFiles = await discoverMatrixFiles(cwd, outDir)

  const lintMasters = await spawn(lintTool.execPath, [...masters.map((m) => m.path), '--rule', 'schema=error'], { cwd })
  steps.push({ label: 'lint (masters)', tool: 'lint', code: lintMasters.code, stdout: lintMasters.stdout, stderr: lintMasters.stderr })

  if (matrixFiles.length > 0) {
    const lintMatrix = await spawn(lintTool.execPath, [...matrixFiles, '--rule', 'schema=error'], { cwd })
    steps.push({ label: 'lint (matrix)', tool: 'lint', code: lintMatrix.code, stdout: lintMatrix.stdout, stderr: lintMatrix.stderr })
  } else {
    steps.push({ label: 'lint (matrix)', tool: 'lint', code: 0, skipped: true, stdout: 'no built matrix found — run "jrx build" first' })
  }

  if (masters.length >= 2) {
    const parityTool = requireTool('parity', { cwd })
    const parityResult = await spawn(
      parityTool.execPath,
      masters.map((m) => m.path),
      { cwd }
    )
    steps.push({ label: 'parity (masters)', tool: 'parity', code: parityResult.code, stdout: parityResult.stdout, stderr: parityResult.stderr })
  } else {
    steps.push({ label: 'parity (masters)', tool: 'parity', code: 0, skipped: true, stdout: 'fewer than 2 masters — nothing to compare' })
  }

  for (const master of masters) {
    const variantsDir = await resolveVariantsDir(master.lang, overrides, cwd)
    const result = await spawn(tailorTool.execPath, ['check', '--resume', master.path, '--variants-dir', variantsDir], { cwd })
    steps.push({
      label: `tailor check (${master.lang ?? 'default'})`,
      tool: 'tailor',
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr
    })
  }

  if (flags.theme) {
    const resumeTool = requireTool('resume', { cwd })
    const env = chromiumEnv()
    if (!env) {
      throw new CliUsageError(
        "no Chromium/Chrome found for `resume audit` (needed by resume-cli's Puppeteer-based renderer). " +
          'Install Chromium/Chrome or set PUPPETEER_EXECUTABLE_PATH, or omit --theme to skip the audit step.'
      )
    }
    const auditTargets = [...masters.map((m) => m.path), ...matrixFiles]
    for (const file of auditTargets) {
      const result = await spawn(resumeTool.execPath, ['audit', file, '--theme', flags.theme], {
        cwd,
        env: { ...process.env, ...env }
      })
      steps.push({ label: `audit (${file})`, tool: 'resume', code: result.code, stdout: result.stdout, stderr: result.stderr })
    }
  } else {
    steps.push({ label: 'audit', tool: 'resume', code: 0, skipped: true, stdout: 'no --theme given — skipped (pass --theme to run the ATS audit)' })
  }

  const report = aggregate(steps)
  return { code: report.code, stdout: formatReport(report, { verbose }) }
}
