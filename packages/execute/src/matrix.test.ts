import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { discoverMasters, resolveVariantsDir } from './matrix.js'

describe('discoverMasters', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-matrix-test-'))
    dirs.push(dir)
    return dir
  }

  it('returns an empty list when the directory has no resume files', async () => {
    const dir = await tempDir()
    expect(await discoverMasters(dir)).toEqual([])
  })

  it('finds a bare resume.json with no locale', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'resume.json'), '{}')
    expect(await discoverMasters(dir)).toEqual([{ lang: undefined, path: path.join(dir, 'resume.json') }])
  })

  it('finds resume.<lang>.json files, sorted, with locales extracted', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'resume.es.json'), '{}')
    await writeFile(path.join(dir, 'resume.en.json'), '{}')
    expect(await discoverMasters(dir)).toEqual([
      { lang: 'en', path: path.join(dir, 'resume.en.json') },
      { lang: 'es', path: path.join(dir, 'resume.es.json') }
    ])
  })

  it('extracts region-qualified locales', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'resume.en-US.json'), '{}')
    expect(await discoverMasters(dir)).toEqual([{ lang: 'en-US', path: path.join(dir, 'resume.en-US.json') }])
  })

  it('ignores unrelated json files', async () => {
    const dir = await tempDir()
    await writeFile(path.join(dir, 'resume.en.json'), '{}')
    await writeFile(path.join(dir, 'package.json'), '{}')
    await writeFile(path.join(dir, 'variant-backend.json'), '{}')
    expect(await discoverMasters(dir)).toEqual([{ lang: 'en', path: path.join(dir, 'resume.en.json') }])
  })

  it('returns an empty list when the directory does not exist', async () => {
    expect(await discoverMasters('/definitely/not/a/real/dir')).toEqual([])
  })
})

describe('resolveVariantsDir', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-matrix-test-'))
    dirs.push(dir)
    return dir
  }

  it('defaults to the flat "variants" dir when nothing else applies', async () => {
    const dir = await tempDir()
    expect(await resolveVariantsDir(undefined, [], dir)).toBe('variants')
    expect(await resolveVariantsDir('en', [], dir)).toBe('variants')
  })

  it('prefers a per-language dir when it exists on disk', async () => {
    const dir = await tempDir()
    await mkdir(path.join(dir, 'variants', 'en'), { recursive: true })
    expect(await resolveVariantsDir('en', [], dir)).toBe(path.join('variants', 'en'))
    expect(await resolveVariantsDir('es', [], dir)).toBe('variants') // no variants/es on disk
  })

  it('a bare override applies to every language', async () => {
    const dir = await tempDir()
    expect(await resolveVariantsDir('en', ['custom-dir'], dir)).toBe('custom-dir')
    expect(await resolveVariantsDir(undefined, ['custom-dir'], dir)).toBe('custom-dir')
  })

  it('a <lang>=<dir> override scopes to one language', async () => {
    const dir = await tempDir()
    expect(await resolveVariantsDir('en', ['en=custom-en'], dir)).toBe('custom-en')
    expect(await resolveVariantsDir('es', ['en=custom-en'], dir)).toBe('variants')
  })

  it('a scoped override wins over a bare one for the matching language', async () => {
    const dir = await tempDir()
    expect(await resolveVariantsDir('en', ['bare-dir', 'en=custom-en'], dir)).toBe('custom-en')
    expect(await resolveVariantsDir('es', ['bare-dir', 'en=custom-en'], dir)).toBe('bare-dir')
  })
})
