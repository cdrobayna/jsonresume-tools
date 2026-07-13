import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveTheme } from './theme.js'

describe('resolveTheme', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-theme-test-'))
    dirs.push(dir)
    return dir
  }

  it('returns undefined when no --theme flag and no config file', async () => {
    const dir = await makeTempDir()
    expect(await resolveTheme({}, dir)).toBeUndefined()
  })

  it('returns a discovered config file theme', async () => {
    const dir = await makeTempDir()
    await writeFile(path.join(dir, '.jsonresumetoolsrc.json'), JSON.stringify({ execute: { theme: 'even' } }))

    expect(await resolveTheme({}, dir)).toBe('even')
  })

  it('the --theme flag wins over a discovered config file', async () => {
    const dir = await makeTempDir()
    await writeFile(path.join(dir, '.jsonresumetoolsrc.json'), JSON.stringify({ execute: { theme: 'even' } }))

    expect(await resolveTheme({ theme: 'elegant' }, dir)).toBe('elegant')
  })

  it('loads an explicit --config path even when --theme is also given', async () => {
    const dir = await makeTempDir()
    const configPath = path.join(dir, 'custom.json')
    await writeFile(configPath, JSON.stringify({ execute: { theme: 'even' } }))

    expect(await resolveTheme({ theme: 'elegant', config: configPath }, dir)).toBe('elegant')
  })

  it('throws when an explicit --config path does not exist', async () => {
    const dir = await makeTempDir()
    await expect(resolveTheme({ config: path.join(dir, 'missing.json') }, dir)).rejects.toThrow()
  })
})
