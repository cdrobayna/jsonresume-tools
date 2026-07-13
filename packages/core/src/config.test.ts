import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-tools-config-test-'))
    dirs.push(dir)
    return dir
  }

  it('returns defaults when auto-discovery finds no config', async () => {
    const dir = await makeTempDir()
    const defaults = { rules: { foo: 'error' as const } }

    const config = await loadConfig({
      // Nonce module name so this never collides with a real config found while
      // cosmiconfig searches upward through ancestor directories.
      moduleName: 'jsonresumetoolstestnonce',
      searchFrom: dir,
      defaults
    })

    expect(config).toEqual(defaults)
  })

  it('one-level-deep merges a discovered config over defaults', async () => {
    const dir = await makeTempDir()
    await writeFile(
      // cosmiconfig's default search places only include `.js/.ts/.cjs/.mjs` for the
      // "<moduleName>.config.*" pattern (not `.json`) — the `.<moduleName>rc.json` form does
      // support JSON directly, so we use that here.
      path.join(dir, '.jsonresumetoolstestnoncerc.json'),
      JSON.stringify({ rules: { foo: 'off' } })
    )

    const defaults = { rules: { foo: 'error', bar: 'warn' } }
    const config = await loadConfig({
      moduleName: 'jsonresumetoolstestnonce',
      searchFrom: dir,
      defaults
    })

    expect(config).toEqual({ rules: { foo: 'off', bar: 'warn' } })
  })

  it('loads an explicit config path directly', async () => {
    const dir = await makeTempDir()
    const configPath = path.join(dir, 'custom-name.json')
    await writeFile(configPath, JSON.stringify({ rules: { foo: 'off' } }))

    const defaults = { rules: { foo: 'error' } }
    const config = await loadConfig({
      moduleName: 'jsonresumetoolstestnonce',
      explicitPath: configPath,
      defaults
    })

    expect(config).toEqual({ rules: { foo: 'off' } })
  })

  it('throws when an explicit config path does not exist', async () => {
    const dir = await makeTempDir()
    await expect(
      loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        explicitPath: path.join(dir, 'does-not-exist.json'),
        defaults: { rules: {} }
      })
    ).rejects.toThrow()
  })

  describe('section', () => {
    it('extracts the named section, ignoring sibling sections', async () => {
      const dir = await makeTempDir()
      await writeFile(
        path.join(dir, '.jsonresumetoolstestnoncerc.json'),
        JSON.stringify({ lint: { rules: { foo: 'off' } }, parity: { rules: { bar: 'x' } } })
      )

      const config = await loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        section: 'lint',
        searchFrom: dir,
        defaults: { rules: { foo: 'error', baz: 'warn' } }
      })

      expect(config).toEqual({ rules: { foo: 'off', baz: 'warn' } })
    })

    it('falls back entirely to defaults when the section is absent', async () => {
      const dir = await makeTempDir()
      await writeFile(path.join(dir, '.jsonresumetoolstestnoncerc.json'), JSON.stringify({ parity: { rules: { bar: 'x' } } }))

      const defaults = { rules: { foo: 'error' } }
      const config = await loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        section: 'lint',
        searchFrom: dir,
        defaults
      })

      expect(config).toEqual(defaults)
    })

    it('treats a present-but-empty section the same as an absent one', async () => {
      const dir = await makeTempDir()
      await writeFile(path.join(dir, '.jsonresumetoolstestnoncerc.json'), JSON.stringify({ lint: {} }))

      const defaults = { rules: { foo: 'error' } }
      const config = await loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        section: 'lint',
        searchFrom: dir,
        defaults
      })

      expect(config).toEqual(defaults)
    })

    it('one-level-deep merges inside a section', async () => {
      const dir = await makeTempDir()
      await writeFile(path.join(dir, '.jsonresumetoolstestnoncerc.json'), JSON.stringify({ lint: { rules: { foo: 'off' } } }))

      const config = await loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        section: 'lint',
        searchFrom: dir,
        defaults: { rules: { foo: 'error', bar: 'warn' }, unrelated: true }
      })

      expect(config).toEqual({ rules: { foo: 'off', bar: 'warn' }, unrelated: true })
    })

    it('applies the section to an explicit config path too', async () => {
      const dir = await makeTempDir()
      const configPath = path.join(dir, 'custom-name.json')
      await writeFile(configPath, JSON.stringify({ lint: { rules: { foo: 'off' } } }))

      const config = await loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        section: 'lint',
        explicitPath: configPath,
        defaults: { rules: { foo: 'error' } }
      })

      expect(config).toEqual({ rules: { foo: 'off' } })
    })

    it('falls back to defaults, without throwing, when an explicit path is missing the section', async () => {
      const dir = await makeTempDir()
      const configPath = path.join(dir, 'custom-name.json')
      await writeFile(configPath, JSON.stringify({ parity: { rules: { bar: 'x' } } }))

      const defaults = { rules: { foo: 'error' } }
      const config = await loadConfig({
        moduleName: 'jsonresumetoolstestnonce',
        section: 'lint',
        explicitPath: configPath,
        defaults
      })

      expect(config).toEqual(defaults)
    })
  })
})
