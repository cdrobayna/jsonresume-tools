import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { SpawnFn, SpawnResult } from '../spawn.js'
import { runAll } from './all.js'

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

describe('runAll', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function fixtureRepo(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-all-test-'))
    dirs.push(dir)
    await makeBin(dir, 'jsonresume-lint')
    await makeBin(dir, 'jsonresume-tailor')
    await writeFile(dir + '/resume.json', '{}')
    return dir
  }

  it('runs build then check, and skips export without --theme', async () => {
    const cwd = await fixtureRepo()
    const { spawn, calls } = makeSpawnStub()
    const result = await runAll([], { spawn, cwd })

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('[PASS] build')
    expect(result.stdout).toContain('[PASS] check')
    expect(result.stdout).toContain('[SKIP] export')
    expect(calls.some((c) => c.execPath.includes('jsonresume-tailor'))).toBe(true)
    expect(calls.some((c) => c.execPath.includes('jsonresume-lint'))).toBe(true)
  })

  it('exports using a theme from a jsonresumeexecute config file when --theme is not given', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'resume')
    await makeBin(cwd, 'chromium')
    await writeFile(path.join(cwd, '.jsonresumeexecuterc.json'), JSON.stringify({ theme: 'from-config' }))
    const originalPath = process.env.PATH
    process.env.PATH = `${path.join(cwd, 'node_modules', '.bin')}${path.delimiter}${originalPath ?? ''}`
    try {
      const { spawn, calls } = makeSpawnStub()
      const result = await runAll([], { spawn, cwd })

      const exportCalls = calls.filter((c) => c.args[0] === 'export')
      expect(exportCalls.length).toBeGreaterThan(0)
      for (const call of exportCalls) {
        expect(call.args).toContain('from-config')
      }
      expect(result.stdout).not.toContain('[SKIP] export')
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('does not forward --theme/--format to build (which does not accept them)', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'resume')
    await makeBin(cwd, 'chromium')
    const originalPath = process.env.PATH
    process.env.PATH = `${path.join(cwd, 'node_modules', '.bin')}${path.delimiter}${originalPath ?? ''}`
    try {
      const { spawn } = makeSpawnStub()
      // If runAll forwarded raw argv to runBuild, build's parseFlags would reject with
      // "unknown flag: --theme" instead of resolving normally.
      const result = await runAll(['--theme', 'some-theme'], { spawn, cwd })
      expect(result.code).not.toBe(2)
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('reports the worst exit code across build and check', async () => {
    const cwd = await fixtureRepo()
    const { spawn } = makeSpawnStub((execPath) => (execPath.includes('jsonresume-tailor') ? { code: 1 } : {}))
    const result = await runAll([], { spawn, cwd })
    expect(result.code).toBe(1)
  })

  it('throws a CliUsageError when --theme is given but resume-cli is not installed', async () => {
    const cwd = await fixtureRepo()
    const { spawn } = makeSpawnStub()
    await expect(runAll(['--theme', 'my-theme'], { spawn, cwd })).rejects.toThrow(CliUsageError)
  })

  it('exports masters as cv.<lang>.pdf (not cv.resume.<lang>.pdf) and matrix files as cv.<role>.<lang>.pdf', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'jrx-all-test-'))
    dirs.push(cwd)
    await makeBin(cwd, 'jsonresume-lint')
    await makeBin(cwd, 'jsonresume-tailor')
    await makeBin(cwd, 'jsonresume-parity')
    await makeBin(cwd, 'resume')
    await makeBin(cwd, 'chromium')
    await writeFile(path.join(cwd, 'resume.en.json'), '{}')
    await writeFile(path.join(cwd, 'resume.es.json'), '{}')
    await mkdir(path.join(cwd, 'dist'), { recursive: true })
    await writeFile(path.join(cwd, 'dist', 'backend.en.json'), '{}')

    const originalPath = process.env.PATH
    process.env.PATH = `${path.join(cwd, 'node_modules', '.bin')}${path.delimiter}${originalPath ?? ''}`
    try {
      const { spawn, calls } = makeSpawnStub()
      await runAll(['--theme', 'my-theme'], { spawn, cwd })

      const exportPaths = calls.filter((c) => c.args[0] === 'export').map((c) => c.args[1])
      expect(exportPaths).toContain(path.join('dist', 'cv.en.pdf'))
      expect(exportPaths).toContain(path.join('dist', 'cv.es.pdf'))
      expect(exportPaths).toContain(path.join('dist', 'cv.backend.en.pdf'))
      expect(exportPaths).not.toContain(path.join('dist', 'cv.resume.en.pdf'))
      expect(exportPaths).not.toContain(path.join('dist', 'cv.resume.es.pdf'))
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('exports without a system Chromium — lets Puppeteer self-resolve instead of throwing', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'resume')
    // Deliberately no `chromium` bin on PATH, and PATH is scoped to only the temp .bin dir —
    // this is the exact scenario from ISSUE-chromium-detection.md: no system Chromium, no
    // PUPPETEER_EXECUTABLE_PATH, but resume-cli's own Puppeteer would resolve its own Chrome.
    const originalPath = process.env.PATH
    const originalExecPath = process.env.PUPPETEER_EXECUTABLE_PATH
    process.env.PATH = path.join(cwd, 'node_modules', '.bin')
    delete process.env.PUPPETEER_EXECUTABLE_PATH
    try {
      const { spawn, calls } = makeSpawnStub()
      const result = await runAll(['--theme', 'my-theme'], { spawn, cwd })

      expect(result.code).toBe(0)
      const exportCalls = calls.filter((c) => c.args[0] === 'export')
      expect(exportCalls.length).toBeGreaterThan(0)
      for (const call of exportCalls) {
        expect(call.env?.PUPPETEER_EXECUTABLE_PATH).toBeUndefined()
        expect(call.env?.RESUME_PUPPETEER_NO_SANDBOX).toBeUndefined()
      }
    } finally {
      process.env.PATH = originalPath
      if (originalExecPath === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH
      else process.env.PUPPETEER_EXECUTABLE_PATH = originalExecPath
    }
  })

  it('still overrides PUPPETEER_EXECUTABLE_PATH when a system Chromium is found', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'resume')
    await makeBin(cwd, 'chromium')
    const originalPath = process.env.PATH
    process.env.PATH = `${path.join(cwd, 'node_modules', '.bin')}${path.delimiter}${originalPath ?? ''}`
    try {
      const { spawn, calls } = makeSpawnStub()
      await runAll(['--theme', 'my-theme'], { spawn, cwd })

      const exportCalls = calls.filter((c) => c.args[0] === 'export')
      expect(exportCalls.length).toBeGreaterThan(0)
      for (const call of exportCalls) {
        expect(call.env?.PUPPETEER_EXECUTABLE_PATH).toBe(path.join(cwd, 'node_modules', '.bin', 'chromium'))
        expect(call.env?.RESUME_PUPPETEER_NO_SANDBOX).toBe('1')
      }
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('--dry-run skips the actual export rendering once resume-cli and Chromium are available', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'resume')
    await makeBin(cwd, 'chromium')
    const originalPath = process.env.PATH
    process.env.PATH = `${path.join(cwd, 'node_modules', '.bin')}${path.delimiter}${originalPath ?? ''}`
    try {
      const { spawn, calls } = makeSpawnStub()
      const result = await runAll(['--theme', 'my-theme', '--dry-run'], { spawn, cwd })
      expect(result.stdout).toContain('[SKIP] export (')
      expect(calls.some((c) => c.args.includes('export'))).toBe(false)
      expect(result.code).toBe(0)
    } finally {
      process.env.PATH = originalPath
    }
  })
})
