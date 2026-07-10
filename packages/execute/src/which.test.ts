import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findLocalBin, findOnPath, resolveBin } from './which.js'

describe('findLocalBin', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-which-test-'))
    dirs.push(dir)
    return dir
  }

  it('finds a bin directly under node_modules/.bin', async () => {
    const dir = await tempDir()
    await mkdir(path.join(dir, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(dir, 'node_modules', '.bin', 'mytool'), '#!/usr/bin/env node\n')
    expect(findLocalBin('mytool', dir)).toBe(path.join(dir, 'node_modules', '.bin', 'mytool'))
  })

  it('walks up from a nested cwd', async () => {
    const dir = await tempDir()
    await mkdir(path.join(dir, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(dir, 'node_modules', '.bin', 'mytool'), '')
    const nested = path.join(dir, 'a', 'b', 'c')
    await mkdir(nested, { recursive: true })
    expect(findLocalBin('mytool', nested)).toBe(path.join(dir, 'node_modules', '.bin', 'mytool'))
  })

  it('returns undefined when nothing matches', async () => {
    const dir = await tempDir()
    expect(findLocalBin('nope', dir)).toBeUndefined()
  })
})

describe('findOnPath', () => {
  const dirs: string[] = []
  const originalPath = process.env.PATH

  afterEach(async () => {
    process.env.PATH = originalPath
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  it('finds a binary in one of the PATH directories', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-which-path-test-'))
    dirs.push(dir)
    await writeFile(path.join(dir, 'mytool'), '')
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ''}`
    expect(findOnPath('mytool')).toBe(path.join(dir, 'mytool'))
  })

  it('returns undefined when not found on PATH', () => {
    process.env.PATH = '/definitely/not/a/real/dir'
    expect(findOnPath('definitely-not-a-real-binary')).toBeUndefined()
  })
})

describe('resolveBin', () => {
  const dirs: string[] = []
  const originalPath = process.env.PATH

  afterEach(async () => {
    process.env.PATH = originalPath
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  it('prefers a local node_modules/.bin match over PATH', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-resolvebin-test-'))
    dirs.push(dir)
    await mkdir(path.join(dir, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(dir, 'node_modules', '.bin', 'mytool'), '')
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ''}`
    await writeFile(path.join(dir, 'mytool'), '') // also present directly on PATH

    const resolved = resolveBin('mytool', dir)
    expect(resolved).toEqual({ execPath: path.join(dir, 'node_modules', '.bin', 'mytool'), source: 'workspace' })
  })

  it('falls back to PATH when there is no local match', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-resolvebin-test-'))
    dirs.push(dir)
    await writeFile(path.join(dir, 'mytool'), '')
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ''}`

    const resolved = resolveBin('mytool', dir)
    expect(resolved).toEqual({ execPath: path.join(dir, 'mytool'), source: 'path' })
  })

  it('returns undefined when the binary is nowhere to be found', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-resolvebin-test-'))
    dirs.push(dir)
    process.env.PATH = '/definitely/not/a/real/dir'
    expect(resolveBin('nope', dir)).toBeUndefined()
  })
})
