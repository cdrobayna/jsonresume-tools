import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { SpawnFn } from '../spawn.js'
import { runRun } from './run.js'

describe('runRun', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-run-test-'))
    dirs.push(dir)
    return dir
  }

  it('throws a CliUsageError when no tool name is given', async () => {
    await expect(runRun([])).rejects.toThrow(CliUsageError)
  })

  it('resolves a registered tool id and forwards args after the tool name', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules', '.bin', 'jsonresume-tailor'), '')

    const calls: Array<{ execPath: string; args: string[] }> = []
    const spawn: SpawnFn = async (execPath, args) => {
      calls.push({ execPath, args })
      return { code: 0, stdout: '', stderr: '' }
    }

    const result = await runRun(['tailor', 'list'], { spawn, cwd })
    expect(result.code).toBe(0)
    expect(calls).toHaveLength(1)
    expect(calls[0].execPath).toBe(path.join(cwd, 'node_modules', '.bin', 'jsonresume-tailor'))
    expect(calls[0].args).toEqual(['list'])
  })

  it('strips a leading "--" separator before the forwarded args', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules', '.bin', 'jsonresume-tailor'), '')

    const calls: Array<{ execPath: string; args: string[] }> = []
    const spawn: SpawnFn = async (execPath, args) => {
      calls.push({ execPath, args })
      return { code: 0, stdout: '', stderr: '' }
    }

    await runRun(['tailor', '--', 'list', '-d', 'variants'], { spawn, cwd })
    expect(calls[0].args).toEqual(['list', '-d', 'variants'])
  })

  it('throws a CliUsageError with an install hint for a registered tool that is not installed', async () => {
    const cwd = await tempDir()
    const spawn: SpawnFn = async () => ({ code: 0, stdout: '', stderr: '' })
    await expect(runRun(['parity'], { spawn, cwd })).rejects.toThrow(CliUsageError)
    await expect(runRun(['parity'], { spawn, cwd })).rejects.toThrow(/jsonresume-parity not found/)
  })

  it('falls back to a plain PATH/local-bin lookup for an arbitrary tool name', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'some-random-tool'), '')
    const originalPath = process.env.PATH
    process.env.PATH = `${cwd}${path.delimiter}${originalPath ?? ''}`
    try {
      const calls: Array<{ execPath: string; args: string[] }> = []
      const spawn: SpawnFn = async (execPath, args) => {
        calls.push({ execPath, args })
        return { code: 0, stdout: '', stderr: '' }
      }
      const result = await runRun(['some-random-tool', 'foo'], { spawn, cwd })
      expect(result.code).toBe(0)
      expect(calls[0].execPath).toBe(path.join(cwd, 'some-random-tool'))
      expect(calls[0].args).toEqual(['foo'])
    } finally {
      process.env.PATH = originalPath
    }
  })

  it('throws a CliUsageError when an arbitrary tool name cannot be found anywhere', async () => {
    const cwd = await tempDir()
    const spawn: SpawnFn = async () => ({ code: 0, stdout: '', stderr: '' })
    await expect(runRun(['definitely-not-a-real-tool'], { spawn, cwd })).rejects.toThrow(CliUsageError)
  })
})
