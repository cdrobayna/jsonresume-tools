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
}

function makeSpawnStub(resultByBin: (execPath: string, args: string[]) => Partial<SpawnResult> = () => ({})): {
  spawn: SpawnFn
  calls: Call[]
} {
  const calls: Call[] = []
  const spawn: SpawnFn = async (execPath, args) => {
    calls.push({ execPath, args })
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

  it('aggregates the worst exit code across steps', async () => {
    const cwd = await fixtureRepo()
    await makeBin(cwd, 'jsonresume-parity')
    const { spawn } = makeSpawnStub((execPath) => (execPath.includes('jsonresume-lint') ? { code: 1 } : {}))
    const result = await runCheck([], { spawn, cwd })
    expect(result.code).toBe(1)
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
