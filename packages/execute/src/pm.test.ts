import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectPackageManager, installCommand } from './pm.js'

describe('detectPackageManager', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-pm-test-'))
    dirs.push(dir)
    return dir
  }

  it('defaults to npm with no signals present', async () => {
    const dir = await tempDir()
    expect(detectPackageManager(dir)).toBe('npm')
  })

  it('prefers the packageManager field in package.json', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.1.0' }))
    expect(detectPackageManager(dir)).toBe('pnpm')
  })

  it('falls back to lockfile detection when packageManager is absent', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'yarn.lock'), '')
    expect(detectPackageManager(dir)).toBe('yarn')
  })

  it('prefers pnpm-lock.yaml over other lockfiles', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'pnpm-lock.yaml'), '')
    await writeFile(path.join(dir, 'package-lock.json'), '')
    expect(detectPackageManager(dir)).toBe('pnpm')
  })

  it('walks up from a nested directory to find the signal', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'bun.lockb'), '')
    const nested = path.join(dir, 'a', 'b', 'c')
    await mkdir(nested, { recursive: true })
    expect(detectPackageManager(nested)).toBe('bun')
  })

  it('ignores a malformed package.json and keeps searching', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'package.json'), '{ not valid json')
    await writeFile(path.join(dir, 'pnpm-lock.yaml'), '')
    expect(detectPackageManager(dir)).toBe('pnpm')
  })
})

describe('installCommand', () => {
  it('builds a dev-install command per package manager', () => {
    expect(installCommand('pnpm', ['foo'])).toBe('pnpm add -D foo')
    expect(installCommand('yarn', ['foo'])).toBe('yarn add -D foo')
    expect(installCommand('bun', ['foo'])).toBe('bun add -D foo')
    expect(installCommand('npm', ['foo'])).toBe('npm install --save-dev foo')
  })

  it('builds a global-install command when requested', () => {
    expect(installCommand('pnpm', ['foo'], { global: true })).toBe('pnpm add -g foo')
    expect(installCommand('npm', ['foo'], { global: true })).toBe('npm install -g foo')
  })

  it('joins multiple packages with a space', () => {
    expect(installCommand('npm', ['foo', 'bar'])).toBe('npm install --save-dev foo bar')
  })
})
