import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { chromiumEnv, detectChromium, detectPuppeteerChromium } from './env.js'

describe('detectChromium', () => {
  const dirs: string[] = []
  const originalPath = process.env.PATH

  afterEach(async () => {
    process.env.PATH = originalPath
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-env-test-'))
    dirs.push(dir)
    return dir
  }

  it('honors an already-set PUPPETEER_EXECUTABLE_PATH without touching PATH', () => {
    process.env.PATH = '/definitely/not/a/real/dir'
    expect(detectChromium({ PUPPETEER_EXECUTABLE_PATH: '/some/chrome' })).toBe('/some/chrome')
  })

  it('finds a chromium candidate on PATH when no PUPPETEER_EXECUTABLE_PATH is set', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'chromium'), '')
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ''}`
    expect(detectChromium({})).toBe(path.join(dir, 'chromium'))
  })

  it('returns undefined when nothing is set and nothing is on PATH', async () => {
    const dir = await tempDir()
    process.env.PATH = dir
    expect(detectChromium({})).toBeUndefined()
  })
})

describe('chromiumEnv', () => {
  const dirs: string[] = []
  const originalPath = process.env.PATH

  afterEach(async () => {
    process.env.PATH = originalPath
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  it('returns the PUPPETEER_EXECUTABLE_PATH + no-sandbox overlay when a Chromium is found', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-env-test-'))
    dirs.push(dir)
    await writeFile(path.join(dir, 'chromium'), '')
    process.env.PATH = `${dir}${path.delimiter}${originalPath ?? ''}`
    expect(chromiumEnv({})).toEqual({
      PUPPETEER_EXECUTABLE_PATH: path.join(dir, 'chromium'),
      RESUME_PUPPETEER_NO_SANDBOX: '1'
    })
  })

  it('returns undefined when no Chromium is found', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-env-test-'))
    dirs.push(dir)
    process.env.PATH = dir
    expect(chromiumEnv({})).toBeUndefined()
  })
})

describe('detectPuppeteerChromium', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-env-puppeteer-test-'))
    dirs.push(dir)
    return dir
  }

  it('returns undefined when there is no puppeteer install to resolve', async () => {
    const dir = await tempDir()
    expect(detectPuppeteerChromium(dir)).toBeUndefined()
  })

  it("resolves puppeteer's own executablePath() when it's installed under cwd", async () => {
    const dir = await tempDir()
    const chromeDir = path.join(dir, 'fake-chrome')
    await mkdir(chromeDir, { recursive: true })
    const chromePath = path.join(chromeDir, 'chrome')
    await writeFile(chromePath, '') // must exist on disk — detectPuppeteerChromium checks existsSync

    const puppeteerDir = path.join(dir, 'node_modules', 'puppeteer')
    await mkdir(puppeteerDir, { recursive: true })
    await writeFile(path.join(puppeteerDir, 'package.json'), JSON.stringify({ name: 'puppeteer', version: '23.11.1', main: 'index.js' }))
    await writeFile(
      path.join(puppeteerDir, 'index.js'),
      `module.exports = { executablePath: () => ${JSON.stringify(chromePath)} }\n`
    )

    expect(detectPuppeteerChromium(dir)).toBe(chromePath)
  })

  it("returns undefined when executablePath() points at a file that doesn't exist", async () => {
    const dir = await tempDir()
    const puppeteerDir = path.join(dir, 'node_modules', 'puppeteer')
    await mkdir(puppeteerDir, { recursive: true })
    await writeFile(path.join(puppeteerDir, 'package.json'), JSON.stringify({ name: 'puppeteer', version: '23.11.1', main: 'index.js' }))
    await writeFile(
      path.join(puppeteerDir, 'index.js'),
      `module.exports = { executablePath: () => '/definitely/not/a/real/chrome' }\n`
    )

    expect(detectPuppeteerChromium(dir)).toBeUndefined()
  })
})
