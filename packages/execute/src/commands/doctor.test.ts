import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runDoctor } from './doctor.js'

describe('runDoctor', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-doctor-test-'))
    dirs.push(dir)
    return dir
  }

  it('always exits 0 — it is informational, not a gate', async () => {
    const cwd = await tempDir()
    const result = await runDoctor([], { cwd })
    expect(result.code).toBe(0)
  })

  it('reports every registered tool as missing with an install hint, when none are installed', async () => {
    const cwd = await tempDir()
    const result = await runDoctor([], { cwd })
    expect(result.stdout).toContain('✗ jsonresume-lint')
    expect(result.stdout).toContain('✗ jsonresume-parity')
    expect(result.stdout).toContain('✗ jsonresume-tailor')
    expect(result.stdout).toContain('✗ resume-cli')
    expect(result.stdout).toContain('install:')
    expect(result.stdout).toContain('tool(s) missing')
  })

  it('reports a resolved tool as found, with its version', async () => {
    const cwd = await tempDir()
    const pkgDir = path.join(cwd, 'node_modules', 'jsonresume-lint')
    await mkdir(path.join(pkgDir, 'dist'), { recursive: true })
    await writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({ version: '1.2.3', main: './dist/index.js' }))
    await writeFile(path.join(pkgDir, 'dist', 'index.js'), 'export {}\n')
    await writeFile(path.join(pkgDir, 'dist', 'bin.js'), '')
    await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
    await symlink(path.join(pkgDir, 'dist', 'bin.js'), path.join(cwd, 'node_modules', '.bin', 'jsonresume-lint'))

    const result = await runDoctor([], { cwd })
    expect(result.stdout).toContain('✓ jsonresume-lint (1.2.3)')
  })

  it('reports "all installed" once every tool resolves', async () => {
    const cwd = await tempDir()
    for (const bin of ['jsonresume-lint', 'jsonresume-parity', 'jsonresume-tailor', 'resume']) {
      await mkdir(path.join(cwd, 'node_modules', '.bin'), { recursive: true })
      await writeFile(path.join(cwd, 'node_modules', '.bin', bin), '')
    }
    const result = await runDoctor([], { cwd })
    expect(result.stdout).toContain('All recommended tools are installed.')
  })

  describe('Chromium/Chrome reporting', () => {
    const originalPath = process.env.PATH
    const originalExecPath = process.env.PUPPETEER_EXECUTABLE_PATH

    afterEach(() => {
      process.env.PATH = originalPath
      if (originalExecPath === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH
      else process.env.PUPPETEER_EXECUTABLE_PATH = originalExecPath
    })

    it('reports ✗ Chromium/Chrome when there is no system Chromium and no Puppeteer install', async () => {
      const cwd = await tempDir()
      process.env.PATH = cwd
      delete process.env.PUPPETEER_EXECUTABLE_PATH

      const result = await runDoctor([], { cwd })
      expect(result.stdout).toContain('✗ Chromium/Chrome — not found')
    })

    it('reports ✓ Chromium/Chrome (Puppeteer-managed) when only resume-cli\'s own Puppeteer resolves one', async () => {
      const cwd = await tempDir()
      process.env.PATH = cwd
      delete process.env.PUPPETEER_EXECUTABLE_PATH

      const chromeDir = path.join(cwd, 'fake-chrome')
      await mkdir(chromeDir, { recursive: true })
      const chromePath = path.join(chromeDir, 'chrome')
      await writeFile(chromePath, '')

      const puppeteerDir = path.join(cwd, 'node_modules', 'puppeteer')
      await mkdir(puppeteerDir, { recursive: true })
      await writeFile(path.join(puppeteerDir, 'package.json'), JSON.stringify({ name: 'puppeteer', version: '23.11.1', main: 'index.js' }))
      await writeFile(path.join(puppeteerDir, 'index.js'), `module.exports = { executablePath: () => ${JSON.stringify(chromePath)} }\n`)

      const result = await runDoctor([], { cwd })
      expect(result.stdout).toContain(`✓ Chromium/Chrome — ${chromePath} (Puppeteer-managed)`)
    })
  })
})
