import { spawn as nodeSpawn } from 'node:child_process'

export interface SpawnResult {
  code: number
  stdout: string
  stderr: string
}

export interface SpawnOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
}

/**
 * A spawn implementation: `(execPath, args, opts) -> Promise<SpawnResult>`. Commands accept one
 * as an injectable dependency (default `spawnGate`) so tests can stub the actual child-process
 * execution and assert the exact composed argv per step.
 */
export type SpawnFn = (execPath: string, args: string[], opts?: SpawnOptions) => Promise<SpawnResult>

/**
 * Runs a child process, capturing stdout/stderr instead of inheriting them — used when the
 * orchestrator needs to inspect a step's output and exit code before deciding what to print
 * (e.g. aggregating `build`/`check` results into one report).
 */
export const spawnGate: SpawnFn = (execPath, args, opts = {}) => {
  return new Promise((resolve, reject) => {
    const child = nodeSpawn(execPath, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

/**
 * Runs a child process with stdio inherited so output streams live — used for steps the user
 * should watch happen in real time (e.g. an install command, or a passthrough `jrx run`).
 */
export const spawnTee: SpawnFn = (execPath, args, opts = {}) => {
  return new Promise((resolve, reject) => {
    const child = nodeSpawn(execPath, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: 'inherit'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? 1, stdout: '', stderr: '' }))
  })
}

/**
 * Best-effort JSON parse of a gated step's stdout (e.g. `jsonresume-lint --format json`).
 * Returns undefined on anything that isn't valid JSON rather than throwing — callers decide
 * whether a parse failure matters. Not wired into any v1 command yet; reserved for the Tier 2
 * "richer structured report" (see JSONRESUME-EXECUTE-PLAN.md).
 */
export function parseJsonOutput<T>(result: SpawnResult): T | undefined {
  try {
    return JSON.parse(result.stdout) as T
  } catch {
    return undefined
  }
}
