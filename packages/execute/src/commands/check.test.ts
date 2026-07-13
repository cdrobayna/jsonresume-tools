import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { SpawnFn, SpawnResult } from '../spawn.js'
import { runCheck } from './check.js'

interface Call {
  execPath: string
  args: string[]
  env?: NodeJS.ProcessEnv
}

function makeSpawnStub(resultByBin: (execPath: string, args: string[]) => Partial<SpawnResult> = () => ({})): {
  spawn: SpawnFn
  calls: Call[]
} {
  const calls: Call[] = []
  const spawn: SpawnFn = async (execPath, args, opts) => {
    calls.push({ execPath, args, env: opts?.env })
    return { code: 0, stdout: '', stderr: '', ...resultByBin(execPath, args) }
  }
  return { spawn, calls }
}

async function makeBin(cwd: string, name: string): Promise<void> {
  await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
  await writeFile(path.join(cwd, 'node_modules', '.bin', name), '')
}

describe('runCheck', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function fixtureRepo(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-check-test-'))
    dirs.push(dir)
    await makeBin(dir, 'jsonresume-lint')
    await makeBin(dir, 'jsonresume-tailor')
    await writeFile(path.join(dir, 'resume.en.json'), '{}')
    await writeFile(path.join(dir, 'resume.es.json'), '{}')
    return dir
  }

  it('runs lint (with the schema rule enabled) and tailor check per master; skips parity with < 2 masters', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'jrx-check-test-'))
    dirs.push(cwd)
    await makeBin(cwd, 'jsonresume-lint')
    await makeBin(cwd, 'jsonresume-tailor')
    await writeFile(path.join(cwd, 'resume.json'), '{}')

    const { spawn, calls } = makeSpawnStub()
    const result = await runCheck([], { spawn, cwd })

    expect(result.code).toBe(0)
    const lintCall = calls.find((c) => c.execPath.includes('jsonresume-lint'))
    expect(lintCall?.args).toEqual([path.join(cwd, 'resume.json'), '--rule', 'schema=error'])
    expect(calls.some((c) => c.execPath.includes('jsonresume-parity'))).toBe(false)
    expect(result.stdout).toContain('[SKIP] parity (masters)')
  })

  it('runs parity across masters when there are >= 2', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    const { spawn, calls } = makeSpawnStub()
    const result = await runCheck([], { spawn, cwd })

    const parityCall = calls.find((c) => c.execPath.includes('jsonresume-parity'))
    expect(parityCall?.args).toEqual([path.join(cwd, 'resume.en.json'), path.join(cwd, 'resume.es.json')])
    expect(result.stdout).toContain('[PASS] parity (masters)')
  })

  it('throws a CliUsageError with an install hint when parity is required but missing', async () => {
    const cwd = await fixtureRepo() // 2 masters, but no jsonresume-parity bin
    const { spawn } = makeSpawnStub()
    await expect(runCheck([], { spawn, cwd })).rejects.toThrow(CliUsageError)
    await expect(runCheck([], { spawn, cwd })).rejects.toThrow(/jsonresume-parity not found/)
  })

  it('skips the audit step when no --theme is given', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    const { spawn, calls } = makeSpawnStub()
    const result = await runCheck([], { spawn, cwd })
    expect(calls.some((c) => c.execPath.includes('/resume'))).toBe(false)
    expect(result.stdout).toContain('[SKIP] audit')
  })

  it('runs the audit step using a theme from a jsonresumeexecute config file when --theme is not given', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    await makeBin(cwd, 'resume')
    await writeFile(path.join(cwd, '.jsonresumeexecuterc.json'), JSON.stringify({ theme: 'from-config' }))

    const { spawn, calls } = makeSpawnStub()
    const result = await runCheck([], { spawn, cwd })

    const auditCalls = calls.filter((c) => c.args[0] === 'audit')
    expect(auditCalls.length).toBeGreaterThan(0)
    for (const call of auditCalls) {
      expect(call.args).toContain('from-config')
    }
    expect(result.stdout).not.toContain('[SKIP] audit')
  })

  it('lints the built matrix too when dist/ exists', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    await mkdir(path.join(cwd, 'dist'), { recursive: true })
    await writeFile(path.join(cwd, 'dist', 'backend.en.json'), '{}')
    const { spawn, calls } = makeSpawnStub()
    const result = await runCheck([], { spawn, cwd })

    const lintCalls = calls.filter((c) => c.execPath.includes('jsonresume-lint'))
    expect(lintCalls).toHaveLength(2)
    expect(lintCalls[1].args).toContain(path.join('dist', 'backend.en.json'))
    expect(result.stdout).toContain('[PASS] lint (matrix)')
  })

  it('lints the built matrix when --out-dir is an absolute path outside cwd (regression)', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    const absOutDir = await mkdtemp(path.join(tmpdir(), 'jrx-check-test-outdir-'))
    dirs.push(absOutDir)
    await writeFile(path.join(absOutDir, 'backend.en.json'), '{}')
    const { spawn, calls } = makeSpawnStub()
    const result = await runCheck(['--out-dir', absOutDir], { spawn, cwd })

    const lintCalls = calls.filter((c) => c.execPath.includes('jsonresume-lint'))
    expect(lintCalls).toHaveLength(2)
    expect(lintCalls[1].args).toContain(path.join(absOutDir, 'backend.en.json'))
    expect(result.stdout).toContain('[PASS] lint (matrix)')
    expect(result.stdout).not.toContain('no built matrix found')
  })

  it('aggregates the worst exit code across steps', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    const { spawn } = makeSpawnStub((execPath) => (execPath.includes('jsonresume-lint') ? { code: 1 } : {}))
    const result = await runCheck([], { spawn, cwd })
    expect(result.code).toBe(1)
  })

  it('runs the audit step without a system Chromium — lets Puppeteer self-resolve instead of throwing', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    await makeBin(cwd, 'resume')
    // Deliberately no `chromium` bin, and PATH is scoped to only the temp .bin dir — mirrors
    // ISSUE-chromium-detection.md: no system Chromium, no PUPPETEER_EXECUTABLE_PATH, but
    // resume-cli's own Puppeteer would resolve its own Chrome.
    const originalPath = process.env.PATH
    const originalExecPath = process.env.PUPPETEER_EXECUTABLE_PATH
    process.env.PATH = path.join(cwd, 'node_modules', '.bin')
    delete process.env.PUPPETEER_EXECUTABLE_PATH
    try {
      const { spawn, calls } = makeSpawnStub()
      const result = await runCheck(['--theme', 'my-theme'], { spawn, cwd })

      expect(result.code).toBe(0)
      const auditCalls = calls.filter((c) => c.args[0] === 'audit')
      expect(auditCalls.length).toBeGreaterThan(0)
      for (const call of auditCalls) {
        expect(call.env?.PUPPETEER_EXECUTABLE_PATH).toBeUndefined()
        expect(call.env?.RESUME_PUPPETEER_NO_SANDBOX).toBeUndefined()
      }
    } finally {
      process.env.PATH = originalPath
      if (originalExecPath === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH
      else process.env.PUPPETEER_EXECUTABLE_PATH = originalExecPath
    }
  })

  it('still overrides PUPPETEER_EXECUTABLE_PATH for audit when a system Chromium is found', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    await makeBin(cwd, 'resume')
    await makeBin(cwd, 'chromium')
    const originalPath = process.env.PATH
    process.env.PATH = `${path.join(cwd, 'node_modules', '.bin')}${path.delimiter}${originalPath ?? ''}`
    try {
      const { spawn, calls } = makeSpawnStub()
      await runCheck(['--theme', 'my-theme'], { spawn, cwd })

      const auditCalls = calls.filter((c) => c.args[0] === 'audit')
      expect(auditCalls.length).toBeGreaterThan(0)
      for (const call of auditCalls) {
        expect(call.env?.PUPPETEER_EXECUTABLE_PATH).toBe(path.join(cwd, 'node_modules', '.bin', 'chromium'))
        expect(call.env?.RESUME_PUPPETEER_NO_SANDBOX).toBe('1')
      }
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('surfaces the ATS score inline on the audit status line, even without --verbose', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    await makeBin(cwd, 'resume')
    const auditStdout = [
      '',
      'ATS score: 88/100  (grade B, excellent)',
      '9/10 checks passed, 1 need attention',
      '',
      'Checks:',
      '  ✓ Semantic HTML (10/10)',
      ''
    ].join('\n')
    const { spawn } = makeSpawnStub((execPath, args) => (args[0] === 'audit' ? { stdout: auditStdout } : {}))
    const result = await runCheck(['--theme', 'my-theme'], { spawn, cwd }) // no --verbose

    const auditLine = result.stdout?.split('\n').find((l) => l.includes('audit (') && l.includes('resume.en.json'))
    expect(auditLine).toContain('— 88/100 (grade B, excellent), 9/10 checks passed')
    // full raw dump ("Checks:", per-check lines) still stays hidden without --verbose
    expect(result.stdout).not.toContain('Semantic HTML')
  })

  it('gracefully omits the summary when audit stdout does not match the expected score format', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    await makeBin(cwd, 'resume')
    const { spawn } = makeSpawnStub((execPath, args) =>
      args[0] === 'audit' ? { code: 1, stdout: '', stderr: 'Error: theme "my-theme" not found' } : {}
    )
    const result = await runCheck(['--theme', 'my-theme'], { spawn, cwd })

    const auditLine = result.stdout?.split('\n').find((l) => l.startsWith('[FAIL] audit ('))
    expect(auditLine).toBeDefined()
    expect(auditLine).not.toContain(' — ')
  })

  it('returns exit 2 with no throw when no masters are found', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-check-test-'))
    dirs.push(dir)
    const { spawn } = makeSpawnStub()
    const result = await runCheck([], { spawn, cwd: dir })
    expect(result.code).toBe(2)
    expect(result.stderr).toContain('no master resume files found')
  })
})
