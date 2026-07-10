import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
import { afterEach, describe, expect, it } from 'vitest'
import { REGISTRY, requireTool, resolveTool } from './resolve.js'

describe('REGISTRY', () => {
  it('registers lint, parity, tailor, and resume with their real package/bin names', () => {
    expect(REGISTRY.lint.pkg).toBe('jsonresume-lint')
    expect(REGISTRY.lint.bins).toEqual(['jsonresume-lint', 'jrl'])
    expect(REGISTRY.parity.pkg).toBe('jsonresume-parity')
    expect(REGISTRY.parity.bins).toEqual(['jsonresume-parity', 'jrp'])
    expect(REGISTRY.tailor.pkg).toBe('jsonresume-tailor')
    expect(REGISTRY.tailor.bins).toEqual(['jsonresume-tailor', 'jrt'])
    expect(REGISTRY.resume.pkg).toBe('resume-cli')
    expect(REGISTRY.resume.bins).toEqual(['resume'])
  })
})

describe('resolveTool / requireTool', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-resolve-test-'))
    dirs.push(dir)
    return dir
  }

  it('resolves a tool installed under node_modules/.bin, reading its real version', async () => {
    // Mirrors real npm/pnpm layout: node_modules/.bin/<bin> is a symlink into the package's own
    // directory, so realpath-then-walk-up finds that package's package.json, not .bin's.
    const cwd = await tempDir()
    const pkgDir = path.join(cwd, 'node_modules', 'jsonresume-tailor')
    await mkdir(path.join(pkgDir, 'dist'), { recursive: true })
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'jsonresume-tailor', version: '9.9.9', main: './dist/index.js' })
    )
    await writeFile(path.join(pkgDir, 'dist', 'index.js'), 'export {}\n')
    await writeFile(path.join(pkgDir, 'dist', 'bin.js'), '#!/usr/bin/env node\n')
    await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
    await symlink(path.join(pkgDir, 'dist', 'bin.js'), path.join(cwd, 'node_modules', '.bin', 'jsonresume-tailor'))

    const tool = resolveTool('tailor', { cwd })
    expect(tool).not.toBeNull()
    expect(tool?.source).toBe('workspace')
    expect(tool?.version).toBe('9.9.9')
    expect(tool?.execPath).toBe(path.join(cwd, 'node_modules', '.bin', 'jsonresume-tailor'))
  })

  it('resolves the correct version even when the .bin entry is a plain shim script, not a symlink', async () => {
    // Regression test: pnpm commonly generates node_modules/.bin/<bin> as a small shim SCRIPT
    // (a real file sitting directly in .bin/), not a symlink into the package. Walking up from
    // the shim's own path finds nothing until it reaches the CONSUMER's own package.json —
    // silently reporting the wrong (consumer's) version instead of the tool's. Resolving by
    // package name (not by bin path) is what avoids that.
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ name: 'someones-resume-repo', version: '0.1.0' }))

    const pkgDir = path.join(cwd, 'node_modules', 'jsonresume-tailor')
    await mkdir(path.join(pkgDir, 'dist'), { recursive: true })
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'jsonresume-tailor', version: '9.9.9', main: './dist/index.js' })
    )
    await writeFile(path.join(pkgDir, 'dist', 'index.js'), 'export {}\n')

    await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
    // A plain file, not a symlink — this is the shim case.
    await writeFile(path.join(cwd, 'node_modules', '.bin', 'jsonresume-tailor'), '#!/usr/bin/env node\nrequire("../jsonresume-tailor/dist/bin.js")\n')

    const tool = resolveTool('tailor', { cwd })
    expect(tool?.version).toBe('9.9.9')
    expect(tool?.version).not.toBe('0.1.0')
  })

  it('returns null when the tool cannot be found', async () => {
    const cwd = await tempDir()
    expect(resolveTool('tailor', { cwd })).toBeNull()
  })

  it('requireTool throws a CliUsageError naming the package and an install command', async () => {
    const cwd = await tempDir()
    expect(() => requireTool('parity', { cwd })).toThrow(CliUsageError)
    try {
      requireTool('parity', { cwd })
      throw new Error('expected requireTool to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(CliUsageError)
      expect((err as Error).message).toContain('jsonresume-parity not found')
      expect((err as Error).message).toContain('install ')
    }
  })

  it('requireTool returns the resolved tool without throwing when it is found', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules', '.bin', 'jrl'), '')
    const tool = requireTool('lint', { cwd })
    expect(tool.execPath).toBe(path.join(cwd, 'node_modules', '.bin', 'jrl'))
  })
})
