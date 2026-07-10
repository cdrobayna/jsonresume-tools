import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { SpawnFn } from '../spawn.js'
import { runSetup } from './setup.js'

describe('runSetup', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-setup-test-'))
    dirs.push(dir)
    return dir
  }

  it('reports nothing to do when every tool is already resolvable', async () => {
    const cwd = await tempDir()
    for (const bin of ['jsonresume-lint', 'jsonresume-parity', 'jsonresume-tailor', 'resume']) {
      await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
      await writeFile(path.join(cwd, 'node_modules', '.bin', bin), '')
    }
    const result = await runSetup([], { cwd, confirm: async () => true })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('already installed')
  })

  it('--dry-run only prints the command, never confirms or spawns', async () => {
    const cwd = await tempDir()
    let confirmCalled = false
    let spawnCalled = false
    const spawn: SpawnFn = async () => {
      spawnCalled = true
      return { code: 0, stdout: '', stderr: '' }
    }
    const result = await runSetup(['--dry-run'], {
      cwd,
      spawn,
      confirm: async () => {
        confirmCalled = true
        return true
      }
    })
    expect(result.stdout).toContain('Would run:')
    expect(confirmCalled).toBe(false)
    expect(spawnCalled).toBe(false)
  })

  it('aborts without installing when the user declines the confirmation prompt', async () => {
    const cwd = await tempDir()
    let spawnCalled = false
    const spawn: SpawnFn = async () => {
      spawnCalled = true
      return { code: 0, stdout: '', stderr: '' }
    }
    const result = await runSetup([], { cwd, spawn, confirm: async () => false })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Aborted')
    expect(spawnCalled).toBe(false)
  })

  it('--yes skips the confirmation prompt and installs', async () => {
    const cwd = await tempDir()
    const calls: Array<{ execPath: string; args: string[] }> = []
    const spawn: SpawnFn = async (execPath, args) => {
      calls.push({ execPath, args })
      return { code: 0, stdout: '', stderr: '' }
    }
    let confirmCalled = false
    const result = await runSetup(['--yes'], {
      cwd,
      spawn,
      confirm: async () => {
        confirmCalled = true
        return true
      }
    })
    expect(confirmCalled).toBe(false)
    expect(result.code).toBe(0)
    expect(calls).toHaveLength(1)
    expect(calls[0].execPath).toBe('npm')
    expect(calls[0].args).toEqual(expect.arrayContaining(['install', '--save-dev']))
  })

  it('confirming runs the install command and reports success', async () => {
    const cwd = await tempDir()
    const spawn: SpawnFn = async () => ({ code: 0, stdout: '', stderr: '' })
    const result = await runSetup([], { cwd, spawn, confirm: async () => true })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Installed:')
  })

  it('surfaces a non-zero exit code and message when the install command fails', async () => {
    const cwd = await tempDir()
    const spawn: SpawnFn = async () => ({ code: 1, stdout: '', stderr: '' })
    const result = await runSetup(['--yes'], { cwd, spawn })
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('install command failed')
  })

  it('--global builds a global install command', async () => {
    const cwd = await tempDir()
    const calls: Array<{ execPath: string; args: string[] }> = []
    const spawn: SpawnFn = async (execPath, args) => {
      calls.push({ execPath, args })
      return { code: 0, stdout: '', stderr: '' }
    }
    await runSetup(['--yes', '--global'], { cwd, spawn })
    expect(calls[0].args).toEqual(expect.arrayContaining(['-g']))
  })
})
